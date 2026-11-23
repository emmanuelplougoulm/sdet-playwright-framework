// Expérience 03 sur Firefly III en Docker : d'où viennent les données de test ?
// Trois stratégies, la même suite de tests qui écrivent :
//   jeu-partage        : un seed crée un jeu de données une fois, tous les tests le partagent ;
//   factory-par-test   : chaque test crée ses données par l'API et les supprime à la fin ;
//   factory-par-worker : chaque worker crée ses données une fois, ses tests les partagent.
//
// Prérequis : docker compose -f experiences/03-donnees-de-test/compose.yml up -d --wait
// Usage (depuis la racine du repo) : node experiences/03-donnees-de-test/measure.mjs [runs]
//
// Mesures :
//   1. parallélisme : échecs par run d'une suite de 40 tests, avec 1, 2 puis 4 workers ;
//   2. durée : 8, 40 et 200 tests, 4 workers, médiane de 3 runs ;
//   3. résidus : ce qui reste en base après un run normal, puis après un run interrompu (SIGINT, SIGKILL) ;
//   4. pollution : un test échoue avant de remettre son compte en état ; échecs du run, puis du run suivant.
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const config = path.join(here, 'playwright.config.ts');
const reporter = path.join(here, 'mesure-reporter.ts');
const runs = Number(process.argv[2] ?? 3);
const STRATEGIES = ['jeu-partage', 'factory-par-test', 'factory-par-worker'];
const PHASES = new Set((process.env['MESURE_PHASES'] ?? '1,2,3,4').split(',').map(Number));
const JEU = path.join(here, '.donnees/jeu.json');

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd, env = {}) =>
  execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const somme = (liste) => liste.reduce((acc, e) => { for (const [k, v] of Object.entries(e)) acc[k] = (acc[k] ?? 0) + v; return acc; }, {});

function outil(nom) {
  const sortie = path.join(here, `.outil-${nom}.json`);
  sh(`npx playwright test -c "${path.join(here, 'outils.config.ts')}"`, { OUTIL: nom, OUTIL_SORTIE: sortie });
  const r = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  fs.rmSync(sortie);
  return r;
}
// Repart d'une instance vide : supprime les données de l'expérience et le jeu partagé.
function nettoyer() {
  fs.rmSync(JEU, { force: true });
  return outil('nettoyer');
}
const inventaire = () => outil('inventaire');

function lancer(projet, env = {}) {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} --reporter="${reporter}"`, { MESURE_SORTIE: sortie, ...env });
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  fs.rmSync(sortie);
  return m;
}

// Lance un run et l'interrompt après `apresMs`, comme une CI annulée (SIGINT) ou un runner tué (SIGKILL).
async function interrompre(projet, signal, apresMs, env = {}) {
  const enfant = spawn('npx', ['playwright', 'test', '-c', config, `--project=${projet}`, '--reporter=dot'],
    { cwd: root, detached: true, stdio: 'ignore', env: { ...process.env, ...env } });
  const fin = new Promise((r) => enfant.on('exit', r));
  await dormir(apresMs);
  try { process.kill(-enfant.pid, signal); } catch { /* déjà terminé */ }
  await Promise.race([fin, dormir(60_000)]);
  try { process.kill(-enfant.pid, 'SIGKILL'); } catch { /* déjà terminé */ }
  await dormir(3_000);
}

const fichier = path.join(here, 'resultats.json');
const anciens = fs.existsSync(fichier) ? JSON.parse(fs.readFileSync(fichier, 'utf8')) : {};
const resultats = { parallelisme: {}, duree: {}, residus: {}, pollution: {}, ...anciens };

// 1. Parallélisme : 40 tests, 5 runs par nombre de workers. Le jeu partagé n'est pas recréé entre les runs.
if (PHASES.has(1)) {
  resultats.parallelisme = {};
  for (const workers of [1, 2, 4]) {
    nettoyer();
    const brut = Object.fromEntries(STRATEGIES.map((s) => [s, []]));
    for (let i = 0; i < 5; i++) {
      for (const s of STRATEGIES) {
        const m = lancer(s, { SUITE_TAILLE: '40', WORKERS: String(workers) });
        brut[s].push(m);
        log(`parallélisme · ${workers} worker(s) · ${s} · run ${i + 1} : ${m.echecs} échecs`);
      }
    }
    resultats.parallelisme[workers] = Object.fromEntries(STRATEGIES.map((s) => [s, {
      echecs: brut[s].map((m) => m.echecs),
      erreurs: somme(brut[s].map((m) => m.erreurs)),
      testsEnEchec: somme(brut[s].map((m) => Object.fromEntries(m.titresEnEchec.map((t) => [t.replace(/ · \d+$/, ''), 1])))),
    }]));
  }
}

// 2. Durée : 4 workers, les stratégies à tour de rôle.
if (PHASES.has(2)) {
  resultats.duree = {};
  for (const taille of [8, 40, 200]) {
    nettoyer();
    const brut = Object.fromEntries(STRATEGIES.map((s) => [s, []]));
    for (let i = 0; i < runs; i++) {
      for (const s of STRATEGIES) {
        const m = lancer(s, { SUITE_TAILLE: String(taille) });
        brut[s].push(m);
        log(`durée · ${taille} tests · ${s} · run ${i + 1} : ${m.dureeMs} ms, ${m.echecs} échecs`);
      }
    }
    resultats.duree[taille] = Object.fromEntries(STRATEGIES.map((s) => [s, {
      dureesMs: brut[s].map((m) => m.dureeMs),
      dureeMedianeMs: mediane(brut[s].map((m) => m.dureeMs)),
      echecs: brut[s].map((m) => m.echecs),
    }]));
  }
}

// 3. Résidus : inventaire après un run de 40 tests, puis après un run de 200 tests interrompu à mi-course.
if (PHASES.has(3)) {
  resultats.residus = {};
  for (const s of STRATEGIES) {
    const r = { };
    nettoyer();
    lancer(s, { SUITE_TAILLE: '40' });
    r.apresRunNormal = inventaire();
    for (const signal of ['SIGINT', 'SIGKILL']) {
      nettoyer();
      await interrompre(s, signal, 8_000, { SUITE_TAILLE: '200' });
      r[`apres${signal}`] = inventaire();
    }
    resultats.residus[s] = r;
    log(`résidus · ${s} : ${JSON.stringify(r)}`);
  }
}

// 4. Pollution : un test échoue avant de remettre son compte en état, puis un run normal suit, sans nettoyage.
if (PHASES.has(4)) {
  resultats.pollution = {};
  for (const s of STRATEGIES) {
    const essais = [];
    for (let i = 0; i < runs; i++) {
      nettoyer();
      const sabote = lancer(s, { SUITE_TAILLE: '40', SUITE_SABOTAGE: '1' });
      const suivant = lancer(s, { SUITE_TAILLE: '40' });
      essais.push({
        runSabote: { echecs: sabote.echecs, testsEnEchec: sabote.titresEnEchec },
        runSuivant: { echecs: suivant.echecs, testsEnEchec: suivant.titresEnEchec },
      });
      log(`pollution · ${s} · essai ${i + 1} : ${sabote.echecs} échecs (dont le test saboté), puis ${suivant.echecs} au run suivant`);
    }
    resultats.pollution[s] = essais;
  }
}

nettoyer();
resultats.meta = {
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  firefly: 'fireflyiii/core:version-6.7.9 + mariadb:11.8, en local (Colima)',
  runs,
};
fs.writeFileSync(fichier, JSON.stringify(resultats, null, 2) + '\n');
log('terminé');
