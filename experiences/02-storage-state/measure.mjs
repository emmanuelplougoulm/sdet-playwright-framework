// Expérience 02 : la connexion à l'échelle. Quatre stratégies, la même suite :
//   ui-par-test        : chaque test passe par l'écran de connexion ;
//   api-par-test       : chaque test obtient son propre jeton par l'API ;
//   session-globale    : un projet setup se connecte une fois, la session est partagée (storageState) ;
//   session-par-worker : chaque worker se connecte une fois par l'API, ses tests partagent le jeton.
//
// Usage (depuis la racine du repo) : node experiences/02-storage-state/measure.mjs [runs]
// Le site de démo est un service public : une pause sépare les runs, et les tailles restent modestes.
// MESURE_PHASES=1,2,3 et MESURE_TAILLES=24,48 limitent ce qui est relancé ; les autres phases
// gardent les chiffres déjà présents dans resultats.json.
//
// Le compte de démo est public et partagé : il se verrouille (HTTP 423) après des refus de connexion,
// les nôtres ou ceux d'un autre visiteur. Avant chaque run, on vérifie qu'il répond ; un run touché
// par un verrou ou un refus (423, 401) est écarté, compté dans « exclus », puis refait.
//
// Mesures :
//   1. échelle : durée et connexions pour 8, 24 et 48 tests (3 workers, médiane de N runs) ;
//   2. changement de l'écran de connexion : tests relancés par --only-changed ;
//   3. panne de l'écran de connexion : échecs, tests non exécutés, durée du run rouge ;
//   4. révocation : un test d'API révoque son jeton au début de la suite ;
//   5. expiration : la session a plus de 5 minutes (durée de vie du jeton sur ce site).
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const runs = Number(process.argv[2] ?? 3);
const STRATEGIES = ['ui-par-test', 'api-par-test', 'session-globale', 'session-par-worker'];
const TAILLES = (process.env['MESURE_TAILLES'] ?? '8,24,48').split(',').map(Number);
const PHASES = new Set((process.env['MESURE_PHASES'] ?? '1,2,3,4,5').split(',').map(Number));
const PAUSE_MS = 10_000;
const AGE_JETON_MS = 310_000; // le jeton vit 300 s sur ce site
const API = 'https://api.practicesoftwaretesting.com';
const CLIENT = { email: 'customer@practicesoftwaretesting.com', password: 'welcome01' };

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = (cmd, env = {}, cwd = root) =>
  execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

// Lance un projet avec le reporter de mesure ; renvoie ses chiffres et le journal des connexions.
function lancer(projet, { config = path.join(here, 'playwright.config.ts'), env = {}, extra = '' } = {}) {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  const journal = path.join(here, `.mesure-${projet}.journal`);
  fs.writeFileSync(journal, '');
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} ${extra} --reporter="${path.join(here, 'mesure-reporter.ts')}"`,
      { MESURE_SORTIE: sortie, MESURE_JOURNAL: journal, ...env });
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  const evenements = fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean);
  fs.rmSync(sortie); fs.rmSync(journal);
  m.journal = Object.fromEntries(['connexion-ui', 'connexion-api', 'rafraichissement'].map((e) => [e, evenements.filter((x) => x === e).length]));
  m.connexions = m.journal['connexion-ui'] + m.journal['connexion-api'];
  return m;
}

const fichierResultats = path.join(here, 'resultats.json');
const anciens = fs.existsSync(fichierResultats) ? JSON.parse(fs.readFileSync(fichierResultats, 'utf8')) : {};
const resultats = { echelle: {}, changement: {}, panne: {}, revocation: {}, expiration: {}, ...anciens };
resultats.echelle = { ...anciens.echelle };
resultats.verrous = anciens.verrous ?? [];

// Attend que le compte de démo accepte une connexion (le verrou se lève seul, au bout d'un moment).
async function attendreCompte() {
  for (let essai = 0; essai < 40; essai++) {
    const r = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(CLIENT) });
    if (r.ok) return;
    if (essai === 0) { log(`compte indisponible (HTTP ${r.status}), attente`); resultats.verrous.push({ debut: new Date().toISOString(), statut: r.status }); }
    await dormir(60_000);
  }
  throw new Error('compte de démo indisponible depuis 40 minutes');
}
const compteRepond = async () => (await fetch(`${API}/users/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(CLIENT) })).ok;
// Un run rouge est touché par un verrou si l'API a refusé la connexion, ou si le compte ne répond plus
// juste après (l'écran de connexion, lui, attend sans message jusqu'au timeout).
const toucheParVerrou = async (m) => Object.keys(m.erreurs ?? {}).some((e) => /refusée : (423|401)/.test(e))
  || (m.echecs > 0 || m.nonExecutes > 0) && !(await compteRepond());

// Lance un run sur un compte disponible ; refait (deux fois au plus) un run touché par un verrou.
async function lancerSain(projet, options) {
  let exclus = 0;
  for (;;) {
    await attendreCompte();
    const m = lancer(projet, options);
    if (!(await toucheParVerrou(m)) || exclus === 2) return { ...m, exclus };
    exclus++;
    log(`run ${projet} écarté (compte verrouillé ou refusé), il sera refait`);
    await dormir(PAUSE_MS);
  }
}

// 1. Échelle. Les stratégies tournent à tour de rôle à chaque run, pour répartir les variations du réseau.
for (const taille of PHASES.has(1) ? TAILLES : []) {
  const brut = Object.fromEntries(STRATEGIES.map((s) => [s, []]));
  for (let i = 0; i < runs; i++) {
    for (const s of STRATEGIES) {
      const m = await lancerSain(s, { env: { SUITE_TAILLE: String(taille) } });
      log(`échelle ${taille} · ${s} · run ${i + 1} : ${m.dureeMs} ms, ${m.passes}/${m.attendus}, ${m.connexions} connexions`);
      brut[s].push(m);
      await dormir(PAUSE_MS);
    }
  }
  resultats.echelle[taille] = Object.fromEntries(STRATEGIES.map((s) => [s, {
    dureesMs: brut[s].map((m) => m.dureeMs),
    dureeMedianeMs: mediane(brut[s].map((m) => m.dureeMs)),
    connexions: brut[s][0].connexions,
    runsExclus: brut[s].reduce((n, m) => n + m.exclus, 0),
    runsRouges: brut[s].filter((m) => m.echecs > 0 || m.nonExecutes > 0).length,
    erreurs: brut[s].reduce((acc, m) => { for (const [k, v] of Object.entries(m.erreurs)) acc[k] = (acc[k] ?? 0) + v; return acc; }, {}),
  }]));
}

// 2 et 3. Copie de l'expérience dans un dépôt Git temporaire, pour --only-changed et pour casser l'écran de connexion.
const tmp = path.join(here, '.mesure');
if (PHASES.has(2) || PHASES.has(3)) {
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
for (const e of ['playwright.config.ts', 'commun', 'strategies']) fs.cpSync(path.join(here, e), path.join(tmp, e), { recursive: true });
sh('git init -q && git add -A && git -c user.name=mesure -c user.email=mesure@localhost commit -qm base', {}, tmp);
const loginPage = path.join(tmp, 'commun/LoginPage.ts');
const src = fs.readFileSync(loginPage, 'utf8');
const OLD = "getByTestId('login-submit')";
try {
  fs.writeFileSync(loginPage, src.replace(OLD, "getByTestId('login-button')"));
  for (const s of PHASES.has(2) ? STRATEGIES : []) {
    const liste = sh(`npx playwright test -c "${tmp}/playwright.config.ts" --project=${s} --list --only-changed`);
    const total = liste.match(/Total: (\d+) tests? in (\d+) files?/);
    resultats.changement[s] = {
      testsRelances: total ? Number(total[1]) : 0,
      setupRelance: liste.includes('[setup]'),
    };
  }
  fs.writeFileSync(loginPage, src.replace(OLD, "getByTestId('bouton-inexistant')"));
  for (const s of PHASES.has(3) ? STRATEGIES : []) {
    await attendreCompte();
    const m = lancer(s, { config: path.join(tmp, 'playwright.config.ts'), env: { SUITE_TAILLE: '8' } });
    resultats.panne[s] = { dureeMs: m.dureeMs, echecs: m.echecs, nonExecutes: m.nonExecutes, setup: m.setup };
    log(`panne · ${s} : ${JSON.stringify(resultats.panne[s])}`);
    await dormir(PAUSE_MS);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
}

// 4. Révocation : 24 tests + un test d'API qui révoque son jeton (déconnexion côté serveur).
for (const s of PHASES.has(4) ? STRATEGIES : []) {
  const brut = [];
  for (let i = 0; i < runs; i++) {
    const m = await lancerSain(s, { env: { SUITE_TAILLE: '24', SUITE_REVOCATION: '1' } });
    brut.push(m);
    log(`révocation · ${s} · run ${i + 1} : ${m.echecs} échecs`);
    await dormir(PAUSE_MS);
  }
  resultats.revocation[s] = { echecs: brut.map((m) => m.echecs), exclus: brut.reduce((n, m) => n + m.exclus, 0), erreurs: brut.map((m) => m.erreurs) };
}

// 5. Expiration : on prépare les sessions, on attend qu'elles aient plus de 5 minutes, puis on lance 24 tests.
//    session-globale réutilise le fichier storageState (--no-deps) ; session-par-worker reçoit des jetons vieillis.
const connexionApi = async () => {
  const r = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(CLIENT) });
  return (await r.json()).access_token;
};
const agees = path.join(here, '.auth/jetons-ages.json');
if (PHASES.has(5)) resultats.expiration = { 'session-globale': [], 'session-par-worker': [] };
for (let i = 0; i < (PHASES.has(5) ? Math.min(runs, 2) : 0); i++) {
  await attendreCompte();
  lancer('setup');
  fs.writeFileSync(agees, JSON.stringify([await connexionApi(), await connexionApi(), await connexionApi()]));
  log(`expiration · essai ${i + 1} : sessions prêtes, attente de ${AGE_JETON_MS / 1000} s`);
  await dormir(AGE_JETON_MS);
  for (const [s, env, extra] of [['session-globale', {}, '--no-deps'], ['session-par-worker', { SESSION_AGEE: agees }, '']]) {
    const m = lancer(s, { env: { SUITE_TAILLE: '24', ...env }, extra });
    resultats.expiration[s].push({ echecs: m.echecs, passes: m.passes, rafraichissements: m.journal['rafraichissement'], erreurs: m.erreurs });
    log(`expiration · ${s} : ${m.passes} passés, ${m.echecs} échecs, ${m.journal['rafraichissement']} rafraîchissements`);
  }
}
fs.rmSync(agees, { force: true });

resultats.meta = {
  ...anciens.meta,
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  runs,
  workers: 3,
  tailles: Object.keys(resultats.echelle).map(Number),
};
fs.writeFileSync(path.join(here, 'resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
log('terminé');
