// Expérience 04 sur le site de démo en local : mocker le réseau, ou pas ?
// La même suite de 6 tests d'interface, trois façons de lui servir l'API, plus des tests de contrat :
//   reelle        : la suite parle à la vraie API ;
//   mocks-manuels : page.route sert des fixtures JSON copiées de la vraie API ;
//   har           : routeFromHAR rejoue le trafic enregistré ;
//   contrat       : des tests d'API vérifient que la vraie API a encore la forme des fixtures.
//
// Prérequis : docker compose -f experiences/04-mocks-reseau/compose.yml up -d
//             puis, une fois : docker compose -f experiences/04-mocks-reseau/compose.yml exec laravel-api php artisan migrate:fresh --seed --force
// Usage (depuis la racine du repo) : node experiences/04-mocks-reseau/measure.mjs [runs]
//
// Mesures :
//   1. durée de chaque suite (médiane de N runs) ;
//   2. détection : 10 bugs injectés un par un (7 dans l'API, 3 dans l'interface), puis 1 changement de données légitime.
//      Un bug est détecté par une suite si un de ses tests, vert sur l'application saine, passe au rouge.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const config = path.join(here, 'playwright.config.ts');
const reporter = path.join(here, 'mesure-reporter.ts');
const runs = Number(process.argv[2] ?? 3);
const SUITES = ['reelle', 'mocks-manuels', 'har', 'contrat'];
const API = 'http://localhost:8091';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd, env = {}, cwd = root) =>
  execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const dc = (args) => sh(`docker compose ${args}`, {}, here);
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

function lancer(projet) {
  const sortie = path.join(here, `.mesure-${projet}.json`);
  try {
    sh(`npx playwright test -c "${config}" --project=${projet} --reporter="${reporter}"`, { MESURE_SORTIE: sortie });
  } catch { /* les runs rouges font partie des mesures */ }
  const m = JSON.parse(fs.readFileSync(sortie, 'utf8'));
  fs.rmSync(sortie);
  return m;
}

// Les bugs : un remplacement exact dans un fichier du conteneur (première occurrence).
const BUGS = [
  { id: 'prix-en-texte', cote: 'api', description: 'l’API renvoie le prix en texte ("14.15") au lieu d’un nombre',
    fichier: 'app/Models/Product.php', avant: '"price" => "double",', apres: '"price" => "string",' },
  { id: 'nom-absent', cote: 'api', description: 'la liste des produits ne renvoie plus le nom',
    fichier: 'app/Services/ProductService.php', avant: "->select('id', 'name', 'description',", apres: "->select('id', 'description'," },
  { id: 'recherche-ignoree', cote: 'api', description: 'la recherche ignore le mot-clé et renvoie tout le catalogue',
    fichier: 'app/Services/ProductService.php', avant: "whereRaw('MATCH(name) AGAINST(? IN BOOLEAN MODE)'", apres: "whereRaw('1=1 OR MATCH(name) AGAINST(? IN BOOLEAN MODE)'" },
  { id: 'pagination-a-3', cote: 'api', description: 'la liste passe à 3 produits par page',
    fichier: 'app/Services/ProductService.php', avant: '$results = $query->filter()->paginate(9);', apres: '$results = $query->filter()->paginate(3);' },
  { id: 'fiche-en-erreur', cote: 'api', description: 'la fiche produit répond par une erreur 500',
    fichier: 'app/Http/Controllers/ProductController.php', avant: '$product = $this->productService->getProductById($id);', apres: "abort(500, 'bug injecté');" },
  { id: 'stock-epuise', cote: 'api', description: 'tous les produits sont déclarés en rupture de stock',
    fichier: 'app/Models/Product.php', avant: 'return $this->stock > 0;', apres: 'return false;' },
  { id: 'filtre-categorie-ignore', cote: 'api', description: 'le filtre par catégorie est ignoré',
    fichier: 'app/Models/Product.php', avant: "return $q->whereIn('category_id', is_array($categories) ? $categories : explode(',', $categories));", apres: 'return $q;' },
  { id: 'parametre-recherche-renomme', cote: 'ui', description: 'l’interface envoie la recherche sous un autre nom de paramètre (query au lieu de q)',
    fichier: 'src/app/_services/product.service.ts', avant: '`${this.apiURL}/search`, { q: query }', apres: '`${this.apiURL}/search`, { query: query }' },
  { id: 'prix-sans-centimes', cote: 'ui', description: 'les cartes du catalogue affichent le prix sans les centimes',
    fichier: 'src/app/products/overview/overview.component.html', avant: '${{ item.price.toFixed(2) }}', apres: '${{ item.price.toFixed(0) }}' },
  { id: 'panier-mauvais-identifiant', cote: 'ui', description: 'l’interface envoie le nom du produit au panier au lieu de son identifiant',
    fichier: 'src/app/_services/cart.service.ts', avant: 'product_id: item.id,', apres: 'product_id: item.name,' },
];
const SERVICE = { api: 'laravel-api', ui: 'angular-ui' };
const RACINE = { api: '/var/www', ui: '/app' };

// L'interface est un build servi en statique (voir compose.yml) : un bug dans son code demande un nouveau build.
// PHP garde le code compilé en mémoire (opcache) et ne relit les fichiers que toutes les 60 s dans cette image :
// on redémarre l'API pour que le bug (ou le code d'origine) s'applique tout de suite, puis on vide le cache de Laravel.
async function redemarrerApi() {
  dc('restart laravel-api');
  for (let i = 0; i < 30; i++) {
    await dormir(1_000);
    const r = await fetch(`${API}/brands`).catch(() => null);
    if (r?.ok) break;
  }
  dc('exec -T laravel-api php artisan cache:clear');
}

const reconstruireInterface = () => dc('exec -T angular-ui npx ng build --configuration development');

async function remplacer(bug, de, vers) {
  const local = path.join(here, '.mutant');
  const distant = `${SERVICE[bug.cote]}:${RACINE[bug.cote]}/${bug.fichier}`;
  dc(`cp "${distant}" "${local}"`);
  const src = fs.readFileSync(local, 'utf8');
  if (!src.includes(de)) throw new Error(`${bug.id} : texte introuvable dans ${bug.fichier}`);
  fs.writeFileSync(local, src.replace(de, vers));
  dc(`cp "${local}" "${distant}"`);
  fs.rmSync(local);
  if (bug.cote === 'api') await redemarrerApi();
  else reconstruireInterface();
}

const echecs = (m) => new Set(m.titresEnEchec);
const fichier = path.join(here, 'resultats.json');
const resultats = { duree: {}, reference: {}, bugs: {}, donnees: {} };

// 1. Durée, et tests rouges sur l'application saine (la référence de la détection).
dc('exec -T laravel-api php artisan cache:clear');
const brut = Object.fromEntries(SUITES.map((s) => [s, []]));
for (let i = 0; i < runs; i++) {
  for (const s of SUITES) {
    const m = lancer(s);
    brut[s].push(m);
    log(`durée · ${s} · run ${i + 1} : ${m.dureeMs} ms, ${m.passes}/${m.attendus}`);
  }
}
for (const s of SUITES) {
  resultats.duree[s] = { dureesMs: brut[s].map((m) => m.dureeMs), dureeMedianeMs: mediane(brut[s].map((m) => m.dureeMs)), tests: brut[s][0].attendus };
  resultats.reference[s] = [...new Set(brut[s].flatMap((m) => m.titresEnEchec))];
}
// Garde-fou : sur l'application saine, la suite réelle et les mocks écrits à la main doivent être verts.
// Sinon l'environnement est en cause (par exemple un conteneur tué faute de mémoire) et la détection ne vaudrait rien.
for (const s of ['reelle', 'mocks-manuels', 'contrat']) {
  if (resultats.reference[s].length) throw new Error(`référence instable pour ${s} : ${resultats.reference[s].join(', ')}`);
}

// 2. Détection : chaque bug est appliqué seul, les quatre suites tournent deux fois, puis le code d'origine revient.
async function mesurerDetection(id, appliquer, retablir) {
  await appliquer();
  const parSuite = {};
  try {
    for (const s of SUITES) {
      const tours = [lancer(s), lancer(s)];
      const nouveaux = tours.map((m) => [...echecs(m)].filter((t) => !resultats.reference[s].includes(t)));
      parSuite[s] = { detecte: nouveaux.every((n) => n.length > 0), testsRouges: [...new Set(nouveaux.flat())], tours: nouveaux.map((n) => n.length) };
    }
  } finally {
    await retablir();
  }
  const controle = lancer('reelle');
  if (controle.echecs) throw new Error(`${id} : l’application rétablie n’est pas verte (${controle.titresEnEchec.join(', ')})`);
  log(`${id} : ${SUITES.map((s) => `${s} ${parSuite[s].detecte ? 'détecté' : 'manqué'}`).join(' · ')}`);
  return parSuite;
}
for (const bug of BUGS) {
  resultats.bugs[bug.id] = {
    cote: bug.cote, description: bug.description,
    ...await mesurerDetection(bug.id, () => remplacer(bug, bug.avant, bug.apres), () => remplacer(bug, bug.apres, bug.avant)),
  };
}

// 3. Un changement de données légitime : le premier produit du catalogue passe en rupture de stock.
const sql = (requete) => dc(`exec -T mariadb mysql -uroot -proot toolshop -N -e "${requete}"`).trim();
const premier = sql('select id from products order by id limit 1');
const stock = sql(`select stock from products where id='${premier}'`);
resultats.donnees['premier-produit-en-rupture'] = {
  description: 'le premier produit du catalogue passe en rupture de stock (un événement normal en production)',
  ...await mesurerDetection('premier-produit-en-rupture',
    async () => { sql(`update products set stock=0 where id='${premier}'`); dc('exec -T laravel-api php artisan cache:clear'); },
    async () => { sql(`update products set stock=${stock} where id='${premier}'`); dc('exec -T laravel-api php artisan cache:clear'); }),
};

resultats.meta = {
  date: new Date().toISOString(),
  playwright: sh('npx playwright --version').trim(),
  application: 'testsmith/practice-software-testing-sprint5 (images Docker), en local (Colima, 2 Go)',
  runs,
  workers: 2,
};
fs.writeFileSync(fichier, JSON.stringify(resultats, null, 2) + '\n');
log('terminé');
