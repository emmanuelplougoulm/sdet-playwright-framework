// Expérience 05 sur le site de démo de l'expérience 04 : quels locators résistent aux changements d'interface ?
// La même suite de 5 tests, quatre jeux de locators : css, texte, role, data-test.
//
// Prérequis : le site de démo de l'expérience 04 tourne (voir experiences/04-mocks-reseau/README.md).
// Usage (depuis la racine du repo) : node experiences/05-locators/measure.mjs [runs]
//
// Mesures : durée et stabilité de chaque suite sur l'interface d'origine, puis 10 changements d'interface, appliqués un par un dans le code Angular (puis un nouveau build),
// en trois familles : refactors invisibles, changements visibles voulus, régressions d'accessibilité.
// Pour chacun, les quatre suites tournent deux fois ; on compte les tests qui passent au rouge.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const config = path.join(here, 'playwright.config.ts');
const reporter = path.join(here, 'mesure-reporter.ts');
const compose = path.resolve(here, '../04-mocks-reseau/compose.yml');
const runs = Number(process.argv[2] ?? 3);
const STRATEGIES = ['css', 'texte', 'role', 'data-test'];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = (cmd, env = {}) =>
  execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const dc = (args) => sh(`docker compose -f "${compose}" ${args}`);
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

function lancer(projet, extra = '') {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} ${extra} --reporter="${reporter}"`, { MESURE_SORTIE: sortie });
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  fs.rmSync(sortie);
  return m;
}

const OVERVIEW = 'src/app/products/overview/overview.component.html';
const DETAIL = 'src/app/products/detail/detail.component.html';
const I18N = 'src/assets/i18n/en.json';
const BOUTON_AJOUTER = `class="btn-success btn" [disabled]="!product.in_stock && !product.is_rental" data-test="add-to-cart"
                id="btn-add-to-cart" (click)="addToCart(product)">
          <fa-icon [icon]="['fas', 'shopping-cart']" class="px-1"></fa-icon>{{ t('pages.product-detail.add-to-cart-btn') }}
        </button>`;

// Chaque changement : une ou plusieurs modifications exactes du code de l'interface.
const CHANGEMENTS = [
  { id: 'titre-de-carte-en-h3', famille: 'refactor', description: 'le nom du produit sur les cartes passe de <h5> à <h3>, avec le même style',
    modifs: [[OVERVIEW, `<h5 data-test="product-name" class="card-title">
                {{ item.name }}
              </h5>`, `<h3 data-test="product-name" class="card-title h5">
                {{ item.name }}
              </h3>`]] },
  { id: 'data-test-renommes', famille: 'refactor', description: 'un nettoyage renomme deux attributs data-test (product-name, add-to-cart)',
    modifs: [[OVERVIEW, 'data-test="product-name"', 'data-test="product-title"'], [DETAIL, '<h1 data-test="product-name">', '<h1 data-test="product-title">'],
      [DETAIL, 'data-test="add-to-cart"', 'data-test="add-to-basket"']] },
  { id: 'couleur-du-bouton-recherche', famille: 'visible', description: 'le bouton de recherche change de couleur (btn-secondary devient btn-primary)',
    modifs: [[OVERVIEW, 'class="btn btn-secondary" type="submit" data-test="search-submit"', 'class="btn btn-primary" type="submit" data-test="search-submit"']] },
  { id: 'style-des-cases', famille: 'visible', description: 'les cases à cocher passent au style Bootstrap (icheck devient form-check-input)',
    modifs: [[OVERVIEW, 'type="checkbox" class="icheck"', 'type="checkbox" class="form-check-input"', 'toutes']] },
  { id: 'add-to-basket', famille: 'visible', description: 'le bouton « Add to cart » devient « Add to basket »',
    modifs: [[I18N, '"add-to-cart-btn": "Add to cart",', '"add-to-cart-btn": "Add to basket",']] },
  { id: 'recherche-en-icone', famille: 'visible', description: 'le bouton de recherche affiche une loupe au lieu du mot « Search » (aria-label conservé)',
    modifs: [[OVERVIEW, `type="submit" data-test="search-submit">{{ t('pages.overview.search') }}`, `type="submit" data-test="search-submit" [attr.aria-label]="t('pages.overview.search')">🔍`]] },
  { id: 'contact-us', famille: 'visible', description: 'le lien « Contact » du menu devient « Contact us »',
    modifs: [[I18N, `"rentals": "Rentals",
      "contact": "Contact",`, `"rentals": "Rentals",
      "contact": "Contact us",`]] },
  { id: 'ajouter-devient-une-div', famille: 'accessibilite', description: 'le bouton « Add to cart » devient une <div> cliquable : plus de rôle bouton, plus de clavier',
    modifs: [[DETAIL, `<button ${BOUTON_AJOUTER}`, `<div ${BOUTON_AJOUTER.replace('[disabled]="!product.in_stock && !product.is_rental" ', '').replace(/<\/button>$/, '</div>')}`]] },
  { id: 'champ-recherche-sans-label', famille: 'accessibilite', description: 'le champ de recherche perd son label (le placeholder reste)',
    // Un commentaire plutôt qu'un texte vide : le retour au code d'origine doit retrouver l'endroit exact.
    modifs: [[OVERVIEW, `<label for="search-query" class="visually-hidden">{{ t('pages.overview.search') }}</label>`, '<!-- label retiré (expérience 05) -->']] },
  { id: 'cases-sans-nom', famille: 'accessibilite', description: 'le nom des catégories sort du <label> : les cases n’ont plus de nom accessible, cliquer sur le nom ne coche plus rien',
    modifs: [[OVERVIEW, `              }
              {{ category.name }}
            </label>`, `              }
            </label>
              {{ category.name }}`]] },
];

// MESURE_VERIFIER=1 vérifie seulement que chaque texte à remplacer existe, sans rien modifier.
if (process.env['MESURE_VERIFIER']) {
  for (const c of CHANGEMENTS) for (const [fichier, avant] of c.modifs) {
    const local = path.join(here, '.changement');
    dc(`cp "angular-ui:/app/${fichier}" "${local}"`);
    console.log(fs.readFileSync(local, 'utf8').includes(avant) ? 'ok ' : 'ABSENT ', c.id, fichier);
    fs.rmSync(local);
  }
  process.exit(0);
}

async function modifier(modifs, sens) {
  for (const [fichier, avant, apres, toutes] of modifs) {
    const [de, vers] = sens === 'appliquer' ? [avant, apres] : [apres, avant];
    const local = path.join(here, '.changement');
    dc(`cp "angular-ui:/app/${fichier}" "${local}"`);
    const src = fs.readFileSync(local, 'utf8');
    if (!de || !vers) throw new Error(`remplacement vide dans ${fichier} : le retour en arrière ne saurait pas où réécrire`);
    if (!src.includes(de)) throw new Error(`texte introuvable dans ${fichier} : ${de.slice(0, 60)}`);
    fs.writeFileSync(local, toutes ? src.split(de).join(vers) : src.replace(de, vers));
    dc(`cp "${local}" "angular-ui:/app/${fichier}"`);
    fs.rmSync(local);
  }
  construire();
}

// Le build Angular tourne dans une VM Docker de 2 Go, sous émulation amd64 : on plafonne le tas de Node
// pour qu'il ne soit pas tué faute de mémoire (à 1 Go, le système le tue : code 137). Même à 768 Mo, il l'est
// parfois : on retente jusqu'à 4 fois, en alternant deux tailles de tas.
const TAS = [768, 640, 768, 640];
function construire() {
  for (let essai = 1; ; essai++) {
    try {
      dc(`exec -T -e NODE_OPTIONS=--max-old-space-size=${TAS[essai - 1]} angular-ui npx ng build --configuration development`);
      return;
    } catch (e) {
      // Seul un build tué faute de mémoire (137) se retente : une erreur de compilation ne changera pas.
      if (essai === TAS.length || e.status !== 137) throw e;
      log(`build interrompu (code ${e.status}), essai ${essai + 1} sur ${TAS.length}`);
    }
  }
}

// Une mesure interrompue peut laisser un changement appliqué. Au démarrage, les fichiers modifiables
// reprennent leur version d'origine, lue dans l'image Docker publiée, et l'interface est reconstruite.
function remettreOrigine() {
  const image = 'testsmith/practice-software-testing-sprint5-ui'; // celle de compose.yml
  const fichiers = [...new Set(CHANGEMENTS.flatMap((c) => c.modifs.map(([f]) => f)))];
  const local = path.join(here, '.changement');
  for (const fichier of fichiers) {
    fs.writeFileSync(local, sh(`docker run --rm --platform linux/amd64 --entrypoint cat ${image} /app/${fichier}`));
    dc(`cp "${local}" "angular-ui:/app/${fichier}"`);
  }
  fs.rmSync(local);
  construire();
  log(`code d'origine remis (${fichiers.length} fichiers) et interface reconstruite`);
}

// Les résultats sont enregistrés au fil de la mesure : une mesure relancée reprend après le dernier changement mesuré.
const partiel = path.join(here, '.mesure-partiel.json');
const resultats = fs.existsSync(partiel) ? JSON.parse(fs.readFileSync(partiel, 'utf8')) : { duree: {}, changements: {} };
const enregistrer = () => fs.writeFileSync(partiel, JSON.stringify(resultats, null, 2));
if (fs.existsSync(partiel)) log(`reprise : ${Object.keys(resultats.changements).length} changements déjà mesurés`);
remettreOrigine();

// 1. Durée et stabilité sur l'interface d'origine : chaque suite tourne N fois, puis 10 fois chaque test
//    (--repeat-each). Un test qui échoue sans aucun changement est instable : on le compte.
if (!resultats.stabilite) {
const brut = Object.fromEntries(STRATEGIES.map((s) => [s, []]));
for (let i = 0; i < runs; i++) for (const s of STRATEGIES) brut[s].push(lancer(s));
resultats.stabilite = {};
for (const s of STRATEGIES) {
  resultats.duree[s] = { dureesMs: brut[s].map((m) => m.dureeMs), dureeMedianeMs: mediane(brut[s].map((m) => m.dureeMs)) };
  const r = lancer(s, '--repeat-each=10');
  const parTest = {};
  for (const t of r.titresEnEchec) parTest[t] = (parTest[t] ?? 0) + 1;
  resultats.stabilite[s] = { executions: r.attendus, echecs: r.echecs, parTest, erreurs: r.erreurs };
  log(`stabilité · ${s} : ${r.echecs} échecs sur ${r.attendus} exécutions ${JSON.stringify(parTest)}`);
}
enregistrer();
}

// Une suite est verte si elle passe en deux essais au plus (le jeu « texte » a un test instable).
function verifierVert(s, contexte) {
  for (let essai = 1; essai <= 2; essai++) if (lancer(s).echecs === 0) return;
  throw new Error(`${contexte} : ${s} reste rouge en deux essais`);
}
for (const s of STRATEGIES) verifierVert(s, 'référence');
log('référence verte', JSON.stringify(Object.fromEntries(STRATEGIES.map((s) => [s, resultats.duree[s].dureeMedianeMs]))));

for (const c of CHANGEMENTS) {
  if (resultats.changements[c.id]) continue;
  const parStrategie = {};
  try {
    await modifier(c.modifs, 'appliquer');
    for (const s of STRATEGIES) {
      const tours = [lancer(s), lancer(s)];
      // Un test est cassé par le changement s'il échoue aux deux runs (un échec isolé peut venir de l'instabilité).
      const casses = tours[0].titresEnEchec.filter((t) => tours[1].titresEnEchec.includes(t));
      parStrategie[s] = {
        testsCasses: casses.length,
        testsCassesTitres: casses,
        tours: tours.map((m) => m.echecs),
        titres: [...new Set(tours.flatMap((m) => m.titresEnEchec))],
        erreurs: tours[0].erreurs,
      };
    }
  } finally {
    await modifier(c.modifs, 'retablir');
  }
  for (const s of STRATEGIES) verifierVert(s, `${c.id}, après le retour au code d’origine`);
  resultats.changements[c.id] = { famille: c.famille, description: c.description, ...parStrategie };
  enregistrer();
  log(`${c.id} (${c.famille}) : ${STRATEGIES.map((s) => `${s} ${parStrategie[s].testsCasses}`).join(' · ')}`);
}

resultats.meta = {
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  application: 'testsmith/practice-software-testing-sprint5 (images Docker), en local',
  runs,
  tests: 5,
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
fs.rmSync(partiel);
log('terminé');
