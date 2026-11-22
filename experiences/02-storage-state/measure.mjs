// Expérience 02 : mesure le coût de la connexion dans deux organisations de la suite.
// Usage (depuis la racine du repo) : node experiences/02-storage-state/measure.mjs [nombre-de-runs]
//
// Les deux versions ont les mêmes 8 tests (specs identiques) et le même LoginPage.
//   par-test : chaque test se connecte par l'interface, dans sa fixture ;
//   session  : un projet setup se connecte une fois et enregistre la session (storageState).
// On mesure :
//   1. la durée de la suite et le nombre de connexions (médiane de N runs, 1 worker) ;
//   2. le coût d'un changement de l'écran de connexion (le bouton change d'attribut data-test) :
//      lignes modifiées et tests relancés par --only-changed ;
//   3. ce qui se passe quand la connexion casse (même changement, sans corriger LoginPage) :
//      échecs, tests non exécutés et durée du run rouge, avec 4 workers comme en CI.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const runs = Number(process.argv[2] ?? 3);
const sh = (cmd, cwd = root, env = {}) =>
  execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });

const versions = { 'par-test': 'Connexion dans chaque test', session: 'Connexion une fois (storageState)' };
const OLD = "getByTestId('login-submit')";
const NEW = "getByTestId('login-button')";

// Lance une version avec le reporter de mesure et renvoie ses chiffres (même si des tests échouent).
const lancer = (config, projet, workers) => {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} --workers=${workers} --reporter="${path.join(here, 'mesure-reporter.ts')}"`, root, { MESURE_SORTIE: sortie });
  } catch { /* un run rouge est attendu dans la mesure 3 */ }
  const chiffres = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  fs.rmSync(sortie);
  return chiffres;
};
const mediane = (valeurs) => [...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)];

const results = Object.fromEntries(Object.entries(versions).map(([k, label]) => [k, { label }]));

// 1. Durée et connexions, N runs par version, un worker pour limiter le bruit.
for (const projet of Object.keys(versions)) {
  const mesures = [];
  for (let i = 0; i < runs; i++) {
    const m = lancer(path.join(here, 'playwright.config.ts'), projet, 1);
    if (m.statut !== 'passed') throw new Error(`${projet} : run ${i + 1} en échec (${JSON.stringify(m)})`);
    mesures.push(m);
  }
  Object.assign(results[projet], {
    testsMetier: mesures[0].passes,
    connexionsParRun: mesures[0].connexions,
    dureesMs: mesures.map((m) => m.dureeMs),
    dureeMedianeMs: mediane(mesures.map((m) => m.dureeMs)),
    msEtapeConnexionMedian: mediane(mesures.map((m) => m.msEtapeConnexion)),
  });
}

// Copie de l'expérience dans un dépôt Git temporaire, pour que --only-changed ait un historique propre.
const tmp = path.join(here, '.mesure');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
for (const entry of ['playwright.config.ts', 'commun', 'par-test', 'session']) fs.cpSync(path.join(here, entry), path.join(tmp, entry), { recursive: true });
sh('git init -q && git add -A && git -c user.name=mesure -c user.email=mesure@localhost commit -qm base', tmp);
const loginPage = path.join(tmp, 'commun/LoginPage.ts');
const src = fs.readFileSync(loginPage, 'utf8');
if (!src.includes(OLD)) throw new Error(`commun/LoginPage.ts ne contient pas ${OLD}`);

try {
  // 2. Le bouton de connexion change d'attribut : on corrige LoginPage et on regarde ce qui est relancé.
  fs.writeFileSync(loginPage, src.replace(OLD, NEW));
  const diff = sh('git diff --numstat', tmp).trim().split('\n').filter(Boolean);
  for (const projet of Object.keys(versions)) {
    const liste = sh(`npx playwright test -c "${tmp}/playwright.config.ts" --project=${projet} --list --only-changed`);
    const total = liste.match(/Total: (\d+) tests? in (\d+) files?/);
    Object.assign(results[projet], {
      changement: {
        fichiersModifies: diff.length,
        lignesModifiees: diff.reduce((n, l) => n + Number(l.split('\t')[0]), 0),
        testsRelances: total ? Number(total[1]) : 0,
        detail: liste.split('\n').filter((l) => l.includes('›')).map((l) => l.trim()),
      },
    });
  }

  // 3. La connexion casse : le site a changé, LoginPage n'est pas encore corrigé.
  //    On simule en cherchant un bouton qui n'existe pas, avec le timeout par défaut (30 s).
  fs.writeFileSync(loginPage, src.replace(OLD, "getByTestId('bouton-inexistant')"));
  for (const projet of Object.keys(versions)) {
    const m = lancer(path.join(tmp, 'playwright.config.ts'), projet, 4);
    results[projet].panne = { dureeMs: m.dureeMs, echecs: m.echecs, nonExecutes: m.nonExecutes, setup: m.setup };
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

results.meta = {
  date: new Date().toISOString(),
  changement: `${OLD} -> ${NEW}`,
  playwright: sh('npx playwright --version').trim(),
  runs,
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(results, null, 2) + '\n');
console.table(Object.fromEntries(Object.keys(versions).map((k) => {
  const r = results[k];
  return [r.label, {
    'durée médiane (ms)': r.dureeMedianeMs,
    connexions: r.connexionsParRun,
    'tests relancés': r.changement.testsRelances,
    'panne : échecs': r.panne.echecs,
    'panne : non exécutés': r.panne.nonExecutes,
    'panne : durée (ms)': r.panne.dureeMs,
  }];
})));
