// Expérience 02 sur Firefly III en Docker : la connexion à l'échelle. Quatre stratégies, la même suite :
//   ui-par-test        : chaque test passe par l'écran de connexion ;
//   http-par-test      : chaque test se connecte par une requête HTTP (sans navigateur) et reçoit les cookies ;
//   session-globale    : un projet setup se connecte une fois, la session est partagée (storageState) ;
//   session-par-worker : chaque worker se connecte une fois par HTTP, ses tests partagent la session.
//
// Prérequis : docker compose -f experiences/02-storage-state/firefly/compose.yml up -d --wait
// Usage (depuis la racine du repo) : node experiences/02-storage-state/firefly/measure.mjs [runs]
//
// Mesures :
//   1. échelle : durée et connexions pour 8, 40 et 200 tests (4 workers, médiane de N runs) ;
//   2. changement de l'écran de connexion : tests relancés par --only-changed ;
//   3. panne de l'écran de connexion : échecs, tests non exécutés, durée du run rouge ;
//   4. déconnexion : un test se déconnecte au début d'une suite de 40 tests, avec 1 puis 4 workers.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const reporter = path.resolve(here, '../mesure-reporter.ts');
const runs = Number(process.argv[2] ?? 3);
const STRATEGIES = ['ui-par-test', 'http-par-test', 'session-globale', 'session-par-worker'];
const TAILLES = [8, 40, 200];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = (cmd, env = {}, cwd = root) =>
  execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

function lancer(projet, { config = path.join(here, 'playwright.config.ts'), env = {} } = {}) {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  const journal = path.join(here, `.mesure-${projet}.journal`);
  fs.writeFileSync(journal, '');
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} --reporter="${reporter}"`, { MESURE_SORTIE: sortie, MESURE_JOURNAL: journal, ...env });
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  m.connexions = fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).length;
  fs.rmSync(sortie); fs.rmSync(journal);
  return m;
}

const resultats = { echelle: {}, changement: {}, panne: {}, deconnexion: {} };

// 1. Échelle. Les stratégies tournent à tour de rôle à chaque run, pour répartir les variations de la machine.
for (const taille of TAILLES) {
  const brut = Object.fromEntries(STRATEGIES.map((s) => [s, []]));
  for (let i = 0; i < runs; i++) {
    for (const s of STRATEGIES) {
      const m = lancer(s, { env: { SUITE_TAILLE: String(taille) } });
      log(`échelle ${taille} · ${s} · run ${i + 1} : ${m.dureeMs} ms, ${m.passes}/${m.attendus}, ${m.connexions} connexions`);
      if (m.echecs || m.nonExecutes) log('  erreurs', JSON.stringify(m.erreurs));
      brut[s].push(m);
    }
  }
  resultats.echelle[taille] = Object.fromEntries(STRATEGIES.map((s) => [s, {
    dureesMs: brut[s].map((m) => m.dureeMs),
    dureeMedianeMs: mediane(brut[s].map((m) => m.dureeMs)),
    connexions: brut[s][0].connexions,
    runsRouges: brut[s].filter((m) => m.echecs > 0 || m.nonExecutes > 0).length,
  }]));
}

// 2 et 3. Copie de l'expérience dans un dépôt Git temporaire, pour --only-changed et pour casser l'écran de connexion.
const tmp = path.join(here, '.mesure');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
for (const e of ['playwright.config.ts', 'commun', 'strategies']) fs.cpSync(path.join(here, e), path.join(tmp, e), { recursive: true });
sh('git init -q && git add -A && git -c user.name=mesure -c user.email=mesure@localhost commit -qm base', {}, tmp);
const loginPage = path.join(tmp, 'commun/LoginPage.ts');
const src = fs.readFileSync(loginPage, 'utf8');
const OLD = `form[action$="/login"] button[type="submit"]`;
try {
  fs.writeFileSync(loginPage, src.replace(OLD, `form[action$="/login"] button.btn-login`));
  for (const s of STRATEGIES) {
    const liste = sh(`npx playwright test -c "${tmp}/playwright.config.ts" --project=${s} --list --only-changed`);
    const total = liste.match(/Total: (\d+) tests? in (\d+) files?/);
    resultats.changement[s] = { testsRelances: total ? Number(total[1]) : 0, setupRelance: liste.includes('[setup]') };
  }
  fs.writeFileSync(loginPage, src.replace(OLD, 'button#bouton-inexistant'));
  for (const s of STRATEGIES) {
    const m = lancer(s, { config: path.join(tmp, 'playwright.config.ts'), env: { SUITE_TAILLE: '8' } });
    resultats.panne[s] = { dureeMs: m.dureeMs, echecs: m.echecs, nonExecutes: m.nonExecutes, setup: m.setup };
    log(`panne · ${s} : ${JSON.stringify(resultats.panne[s])}`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 4. Déconnexion : un test se déconnecte au début d'une suite de 40 tests.
for (const workers of [1, 4]) {
  resultats.deconnexion[workers] = {};
  for (const s of STRATEGIES) {
    const echecs = [];
    for (let i = 0; i < Math.max(runs, 5); i++) {
      const m = lancer(s, { env: { SUITE_TAILLE: '40', SUITE_DECONNEXION: '1', WORKERS: String(workers) } });
      echecs.push(m.echecs);
    }
    resultats.deconnexion[workers][s] = { echecs };
    log(`déconnexion · ${workers} worker(s) · ${s} : ${echecs.join(', ')}`);
  }
}

resultats.meta = {
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  firefly: 'fireflyiii/core:version-6.7.9 + mariadb:11.8, en local (Colima)',
  runs,
  workers: 4,
  tailles: TAILLES,
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
log('terminé');
