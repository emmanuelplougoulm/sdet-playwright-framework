// Expérience 06 sur le site de démo de l'expérience 04 : quels défauts visuels la comparaison de captures rattrape-t-elle, et à quel prix ?
// Trois stratégies capturées (A pleine page, C masquée, D par composant) à deux tailles ; B applique des seuils aux mesures de A.
//
// Prérequis : le site de démo de l'expérience 04 tourne (voir experiences/04-mocks-reseau/README.md), et Docker (ici Colima, 4 Go).
// Usage (depuis la racine du repo) : node experiences/06-captures-visuelles/measure.mjs
// MESURE_VERIFIER=1 vérifie seulement que chaque texte à remplacer existe dans le code de l'interface.
//
// Déroulé : références faites dans l'image Docker de Playwright, stabilité (10 runs), durées (3 runs par stratégie),
// puis 10 changements du code (7 défauts, 3 changements voulus) et 4 sources de bruit sans changement de code.
// Pour chacun, la suite tourne deux fois ; une capture est en échec si elle échoue aux deux runs.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const rel = path.relative(root, here);
const compose = path.resolve(here, '../04-mocks-reseau/compose.yml');
const IMAGE_PW = 'mcr.microsoft.com/playwright:v1.64.1-noble';
const STRATEGIES = ['A', 'C', 'D'];
const SEUILS_B = [0.001, 0.01, 0.05];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = (cmd, env = {}) =>
  execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const dc = (args) => sh(`docker compose -f "${compose}" ${args}`);
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
// L'API garde les produits en cache (Laravel, 120 s) : après une écriture directe en base, on vide ce cache,
// comme le ferait une modification faite par l'administration du site.
const sql = (requete) => {
  dc(`exec -T mariadb mysql -uroot -proot toolshop -e "${requete}"`);
  dc('exec -T laravel-api php artisan cache:clear');
};

// Un run de la suite. Par défaut dans l'image Docker de Playwright ; surMac=true le lance sur le Mac (bruit B2).
function lancer({ extra = '', env = {}, surMac = false } = {}) {
  const sortie = `${rel}/.mesure-run.json`;
  const args = `npx playwright test -c ${rel}/playwright.config.ts ${extra} --reporter=./${rel}/mesure-reporter.ts`;
  const vars = { MESURE_SORTIE: sortie, ...env };
  try {
    if (surMac) sh(args, vars);
    else {
      const e = Object.entries(vars).map(([k, v]) => `-e ${k}=${v}`).join(' ');
      sh(`docker run --rm --network host --ipc=host -v "${root}":/work -w /work ${e} ${IMAGE_PW} ${args}`);
    }
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(path.join(root, sortie), 'utf8'));
  fs.rmSync(path.join(root, sortie));
  return m;
}

const cle = (c) => `${c.projet}/${c.titre}`;

// Deux runs d'un même cas : une capture est en échec si elle échoue aux deux, isolée si elle n'échoue qu'à un.
function deuxRuns(options) {
  const tours = [lancer(options), lancer(options)];
  const parCapture = {};
  for (const [i, t] of tours.entries()) for (const c of t.captures) {
    const p = (parCapture[cle(c)] ??= { ratios: [], statuts: [], erreurs: [] });
    p.ratios[i] = c.ratio;
    p.statuts[i] = c.statut;
    if (c.erreur) p.erreurs[i] = c.erreur;
    if (c.tailleDifferente) p.tailleDifferente = true;
  }
  const bilan = {};
  for (const s of STRATEGIES) {
    const captures = Object.entries(parCapture).filter(([k]) => k.startsWith(`${s}-`));
    const enEchec = captures.filter(([, p]) => p.statuts.every((x) => x !== 'passed')).map(([k]) => k);
    const isolees = captures.filter(([, p]) => p.statuts.filter((x) => x !== 'passed').length === 1).map(([k]) => k);
    bilan[s] = { total: captures.length, enEchec, isolees };
  }
  // B : les captures de A, avec un seuil sur la part de pixels différents (en échec si elle le dépasse aux deux runs).
  const capturesA = Object.entries(parCapture).filter(([k]) => k.startsWith('A-'));
  for (const seuil of SEUILS_B) {
    bilan[`B-${seuil * 100}%`] = {
      total: capturesA.length,
      enEchec: capturesA.filter(([, p]) => p.ratios.every((r) => r > seuil)).map(([k]) => k.replace(/^A-/, 'B-')),
      isolees: capturesA.filter(([, p]) => p.ratios.filter((r) => r > seuil).length === 1).map(([k]) => k.replace(/^A-/, 'B-')),
    };
  }
  return { bilan, captures: parCapture, durees: tours.map((t) => t.dureeMs) };
}

const OVERVIEW_HTML = 'src/app/products/overview/overview.component.html';
const OVERVIEW_CSS = 'src/app/products/overview/overview.component.css';
const DETAIL = 'src/app/products/detail/detail.component.html';
const HEADER = 'src/app/header/header.component.html';
const STYLES = 'src/styles.css';
const I18N = 'src/assets/i18n/en.json';
// Les règles CSS ajoutées s'insèrent devant une règle existante : le retour en arrière retrouve l'endroit exact.
const avantDiscounted = (regle) => [OVERVIEW_CSS, '.discounted {', `${regle}\n\n.discounted {`];
const avantAlert = (regle) => [STYLES, '.alert {', `${regle}\n\n.alert {`];

const CHANGEMENTS = [
  { id: 'D1-nom-tronque', famille: 'defaut', ecrans: ['accueil'], description: 'le nom du produit sur les cartes tient sur une ligne, coupé par des points de suspension',
    modifs: [avantDiscounted('.card-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 7em; }')] },
  { id: 'D2-prix-illisible', famille: 'defaut', ecrans: ['accueil'], description: 'le prix des cartes passe en gris très clair (#c8c8c8)',
    modifs: [avantDiscounted('.card-footer .text-muted { color: #c8c8c8 !important; }')] },
  { id: 'D3-police-de-secours', famille: 'defaut', ecrans: ['accueil', 'fiche', 'contact'], description: 'la pile de polices est remplacée par une police absente : retour à une police à empattements',
    modifs: [avantAlert('body { font-family: "Police Absente", serif !important; }')] },
  { id: 'D4-grille-qui-deborde', famille: 'defaut', ecrans: ['accueil'], description: 'la grille des produits exige des cartes de 420 px au lieu de 250 px',
    modifs: [[OVERVIEW_CSS, 'minmax(250px, 1fr)', 'minmax(420px, 1fr)']] },
  { id: 'D5-bouton-recouvert', famille: 'defaut', ecrans: ['fiche'], description: 'une marge négative fait remonter les boutons de la fiche sur le champ quantité',
    modifs: [[DETAIL, '<div class="btn-group mt-2">', '<div class="btn-group mt-2" style="margin-top: -2.4rem !important">']] },
  { id: 'D6-ecart-espacement', famille: 'defaut', ecrans: ['accueil'], description: 'les espacements internes des cartes passent de 1rem à 0,75rem',
    modifs: [avantDiscounted('.card-body { padding: 0.75rem !important; }')] },
  { id: 'D7-focus-invisible', famille: 'defaut', ecrans: ['accueil', 'fiche', 'contact'], description: 'le contour de focus est supprimé partout',
    modifs: [avantAlert('*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }')] },
  { id: 'V1-en-tete-sombre', famille: 'voulu', ecrans: ['accueil', 'fiche', 'contact'], description: 'l’en-tête passe en sombre (navbar-dark bg-dark)',
    modifs: [[HEADER, 'navbar navbar-expand-lg navbar-light bg-light', 'navbar navbar-expand-lg navbar-dark bg-dark']] },
  { id: 'V2-add-to-basket', famille: 'voulu', ecrans: ['fiche'], description: 'le bouton « Add to cart » devient « Add to basket »',
    modifs: [[I18N, '"add-to-cart-btn": "Add to cart",', '"add-to-cart-btn": "Add to basket",']] },
  { id: 'V3-nouvelle-banniere', famille: 'voulu', ecrans: ['accueil'], description: 'la bannière de l’accueil est remplacée par une autre image',
    modifs: [[OVERVIEW_HTML, 'src="../assets/img/barn-2400x1600.avif"', 'src="../assets/img/testsmith-logo-demo.avif"']] },
];

// Bruit : aucun changement de code. Chaque source a sa mise en place et son retour à l'état d'origine.
const PRIX = { id: '01M84XKTJGDS661NWRHHZ48M1F', origine: '14.15', modifie: '15.15' };
const BRUITS = [
  { id: 'B2-autre-machine', description: 'la suite lancée sur le Mac, hors Docker, contre les références faites sous Linux', options: { surMac: true } },
  { id: 'B3-donnee-modifiee', description: `le prix de « Combination Pliers » passe de ${PRIX.origine} à ${PRIX.modifie} dans la base`,
    avant: () => {
      sql(`update products set price=${PRIX.modifie} where id='${PRIX.id}'`);
      // L'API pourrait servir un cache : on vérifie que le nouveau prix sort bien avant de mesurer.
      if (!sh(`curl -s http://localhost:8091/products/${PRIX.id}`).includes(`"price":${PRIX.modifie}`)) throw new Error('le prix modifié ne sort pas de l’API');
    },
    apres: () => sql(`update products set price=${PRIX.origine} where id='${PRIX.id}'`) },
  { id: 'B4-api-lente', description: 'chaque réponse de l’API est retardée de 1,5 s', options: { env: { BRUIT_API_LENTE: 1500 } } },
  { id: 'B5-souris-sur-carte', description: 'le pointeur survole la première carte au moment de la capture', options: { env: { BRUIT_SOURIS: 1 } } },
];

if (process.env['MESURE_VERIFIER']) {
  for (const c of CHANGEMENTS) for (const [fichier, avant] of c.modifs) {
    const local = path.join(here, '.changement');
    dc(`cp "angular-ui:/app/${fichier}" "${local}"`);
    console.log(fs.readFileSync(local, 'utf8').includes(avant) ? 'ok ' : 'ABSENT ', c.id, fichier);
    fs.rmSync(local);
  }
  process.exit(0);
}

function modifier(modifs, sens) {
  for (const [fichier, avant, apres] of modifs) {
    const [de, vers] = sens === 'appliquer' ? [avant, apres] : [apres, avant];
    const local = path.join(here, '.changement');
    dc(`cp "angular-ui:/app/${fichier}" "${local}"`);
    const src = fs.readFileSync(local, 'utf8');
    if (!de || !vers) throw new Error(`remplacement vide dans ${fichier}`);
    if (!src.includes(de)) throw new Error(`texte introuvable dans ${fichier} : ${de.slice(0, 60)}`);
    fs.writeFileSync(local, src.replace(de, vers));
    dc(`cp "${local}" "angular-ui:/app/${fichier}"`);
    fs.rmSync(local);
  }
  construire();
}

// Même garde-fou que la 05 : le build Angular, émulé en amd64, peut être tué faute de mémoire (137).
const TAS = [768, 640, 768, 640];
function construire() {
  for (let essai = 1; ; essai++) {
    try {
      dc(`exec -T -e NODE_OPTIONS=--max-old-space-size=${TAS[essai - 1]} angular-ui npx ng build --configuration development`);
      return;
    } catch (e) {
      if (essai === TAS.length || e.status !== 137) throw e;
      log(`build interrompu (code ${e.status}), essai ${essai + 1} sur ${TAS.length}`);
    }
  }
}

function remettreOrigine() {
  const image = 'testsmith/practice-software-testing-sprint5-ui';
  const fichiers = [...new Set(CHANGEMENTS.flatMap((c) => c.modifs.map(([f]) => f)))];
  const local = path.join(here, '.changement');
  for (const fichier of fichiers) {
    fs.writeFileSync(local, sh(`docker run --rm --platform linux/amd64 --entrypoint cat ${image} /app/${fichier}`));
    dc(`cp "${local}" "angular-ui:/app/${fichier}"`);
  }
  fs.rmSync(local);
  sql(`update products set price=${PRIX.origine} where id='${PRIX.id}'`);
  construire();
  log(`code d'origine remis (${fichiers.length} fichiers), prix d'origine en base, interface reconstruite`);
}

// La suite doit être verte sur l'interface d'origine avant chaque cas, et après chaque retour en arrière.
function verifierVert(contexte) {
  for (let essai = 1; essai <= 2; essai++) {
    const r = lancer();
    const rouges = r.captures.filter((c) => c.statut !== 'passed');
    if (!rouges.length) return;
    log(`${contexte} : ${rouges.length} capture(s) rouge(s), essai ${essai}`, rouges.map(cle).join(', '));
  }
  throw new Error(`${contexte} : la suite reste rouge en deux essais`);
}

const partiel = path.join(here, '.mesure-partiel.json');
const resultats = fs.existsSync(partiel) ? JSON.parse(fs.readFileSync(partiel, 'utf8')) : { cas: {} };
const enregistrer = () => fs.writeFileSync(partiel, JSON.stringify(resultats, null, 2));
if (fs.existsSync(partiel)) log(`reprise : ${Object.keys(resultats.cas).length} cas déjà mesurés`);
remettreOrigine();

// 1. Références, faites une fois sur l'interface d'origine, dans l'image Docker de Playwright.
if (!resultats.references) {
  lancer({ extra: '--update-snapshots=all' });
  resultats.references = {
    date: new Date().toISOString(),
    tailleKo: Object.fromEntries(STRATEGIES.map((s) => [s, Number(sh(`du -sk ${rel}/references/${s}-* | awk '{t+=$1} END {print t}'`).trim())])),
  };
  enregistrer();
  log('références faites', JSON.stringify(resultats.references.tailleKo));
}

// 2. B1, stabilité : chaque capture 10 fois sur l'interface d'origine. Une capture instable fausserait tout le reste :
//    la mesure s'arrête, et la suite doit être corrigée avant de continuer.
if (!resultats.stabilite) {
  const r = lancer({ extra: '--repeat-each=10' });
  const parCapture = {};
  for (const c of r.captures) {
    const p = (parCapture[cle(c)] ??= { executions: 0, echecs: 0, ratioMax: 0 });
    p.executions++;
    if (c.statut !== 'passed') p.echecs++;
    p.ratioMax = Math.max(p.ratioMax, c.ratio);
  }
  const instables = Object.entries(parCapture).filter(([, p]) => p.echecs > 0);
  resultats.stabilite = { executions: r.captures.length, echecs: instables.reduce((t, [, p]) => t + p.echecs, 0), instables: Object.fromEntries(instables) };
  enregistrer();
  log(`B1 stabilité : ${resultats.stabilite.echecs} échecs sur ${r.captures.length} exécutions`);
  if (instables.length) {
    log('captures instables :', instables.map(([k, p]) => `${k} ${p.echecs}/10`).join(', '));
    log('arrêt : la suite doit être stable avant de mesurer les changements');
    process.exit(1);
  }
}

// 3. Durée : médiane de 3 runs par stratégie, chaque stratégie seule.
if (!resultats.duree) {
  resultats.duree = {};
  for (const s of STRATEGIES) {
    const d = [1, 2, 3].map(() => lancer({ extra: `--project=${s}-bureau --project=${s}-mobile` }).dureeMs);
    resultats.duree[s] = { dureesMs: d, dureeMedianeMs: mediane(d) };
  }
  enregistrer();
  log('durées', JSON.stringify(Object.fromEntries(STRATEGIES.map((s) => [s, resultats.duree[s].dureeMedianeMs]))));
}

verifierVert('référence');

const resume = (b) => Object.entries(b).map(([s, v]) => `${s} ${v.enEchec.length}/${v.total}`).join(' · ');

// 4. Les changements du code : défauts et changements voulus.
for (const c of CHANGEMENTS) {
  if (resultats.cas[c.id]) continue;
  let mesure;
  try {
    modifier(c.modifs, 'appliquer');
    mesure = deuxRuns();
  } finally {
    modifier(c.modifs, 'retablir');
  }
  verifierVert(`${c.id}, après le retour au code d'origine`);
  resultats.cas[c.id] = { famille: c.famille, description: c.description, ecrans: c.ecrans, ...mesure };
  enregistrer();
  log(`${c.id} : ${resume(mesure.bilan)}`);
}

// 5. Le bruit, sans changement de code.
for (const b of BRUITS) {
  if (resultats.cas[b.id]) continue;
  let mesure;
  try {
    b.avant?.();
    mesure = deuxRuns(b.options);
  } finally {
    b.apres?.();
  }
  verifierVert(`${b.id}, après le retour à l'état d'origine`);
  resultats.cas[b.id] = { famille: 'bruit', description: b.description, ...mesure };
  enregistrer();
  log(`${b.id} : ${resume(mesure.bilan)}`);
}

resultats.meta = {
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  image: IMAGE_PW,
  application: 'testsmith/practice-software-testing-sprint5 (images Docker), en local',
  seuilsB: SEUILS_B,
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
fs.rmSync(partiel);
log('terminé');
