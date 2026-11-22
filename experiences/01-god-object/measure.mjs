// Expérience 01 : mesure le coût d'un même changement dans deux organisations du code.
// Usage (depuis la racine du repo) : node experiences/01-god-object/measure.mjs [nombre-de-runs]
//
// Le changement mesuré : « le bouton Ajouter au panier change d'attribut data-test ».
// Il est appliqué de la même façon dans les deux versions, puis on compte :
//   1. les lignes du fichier qu'il faut ouvrir pour faire la modification ;
//   2. les fichiers et lignes modifiés (git diff) ;
//   3. les tests que Playwright relance avec --only-changed (graphe d'imports réel) ;
//   4. la durée de la suite (médiane de N runs), pour vérifier qu'on ne compare pas des vitesses différentes.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const runs = Number(process.argv[2] ?? 3);
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const versions = {
  god: { label: 'God object', cartFile: 'god/App.ts' },
  split: { label: 'Fixtures à la carte', cartFile: 'split/components/Cart.ts' },
};
const OLD = "getByTestId('add-to-cart')";
const NEW = "getByTestId('add-to-cart-button')";

const lines = (file) => fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').length;
const tsFiles = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.ts')).map((f) => path.join(dir, f));

// Copie de l'expérience dans un dépôt Git temporaire, pour que --only-changed ait un historique propre.
const tmp = path.join(here, '.mesure');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
for (const entry of ['playwright.config.ts', 'god', 'split']) fs.cpSync(path.join(here, entry), path.join(tmp, entry), { recursive: true });
sh('git init -q && git add -A && git -c user.name=mesure -c user.email=mesure@localhost commit -qm base', tmp);

const results = {};
try {
  for (const [name, v] of Object.entries(versions)) {
    const cartPath = path.join(tmp, v.cartFile);
    const src = fs.readFileSync(cartPath, 'utf8');
    if (!src.includes(OLD)) throw new Error(`${v.cartFile} ne contient pas ${OLD}`);
    fs.writeFileSync(cartPath, src.replace(OLD, NEW));

    const diff = sh('git diff --numstat', tmp).trim().split('\n').filter(Boolean);
    const list = sh(`npx playwright test -c "${tmp}/playwright.config.ts" --project=${name} --list --only-changed`, root);
    const total = list.match(/Total: (\d+) tests? in (\d+) files?/);
    const all = sh(`npx playwright test -c "${tmp}/playwright.config.ts" --project=${name} --list`, root).match(/Total: (\d+) tests? in (\d+) files?/);

    sh('git checkout -q -- .', tmp);

    results[name] = {
      label: v.label,
      fichierAOuvrir: v.cartFile,
      lignesDuFichierAOuvrir: lines(path.join(here, v.cartFile)),
      fichiersModifies: diff.length,
      lignesModifiees: diff.reduce((n, l) => n + Number(l.split('\t')[0]), 0),
      testsRelances: total ? Number(total[1]) : 0,
      fichiersDeSpecRelances: total ? Number(total[2]) : 0,
      testsAuTotal: Number(all[1]),
      lignesAuTotal: tsFiles(path.join(here, name)).reduce((n, f) => n + lines(f), 0),
      fichiersAuTotal: tsFiles(path.join(here, name)).length,
    };
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Durée de la suite : médiane de N runs complets, un worker pour limiter le bruit.
for (const name of Object.keys(versions)) {
  const durations = [];
  for (let i = 0; i < runs; i++) {
    const out = sh(`npx playwright test -c experiences/01-god-object --project=${name} --workers=1 --reporter=json`);
    const report = JSON.parse(out);
    if (report.stats.unexpected > 0) throw new Error(`${name} : ${report.stats.unexpected} test(s) en échec`);
    durations.push(Math.round(report.stats.duration));
  }
  durations.sort((a, b) => a - b);
  results[name].dureesMs = durations;
  results[name].dureeMedianeMs = durations[Math.floor(durations.length / 2)];
}

results.meta = {
  date: new Date().toISOString(),
  changement: `${OLD} -> ${NEW}`,
  playwright: sh('npx playwright --version').trim(),
  runs,
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(results, null, 2) + '\n');
console.table(Object.fromEntries(Object.keys(versions).map((k) => {
  const { label, dureesMs, ...rest } = results[k];
  return [label, rest];
})));
