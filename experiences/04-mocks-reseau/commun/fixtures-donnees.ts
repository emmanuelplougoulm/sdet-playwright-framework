import fs from 'node:fs';
import path from 'node:path';

// Les fixtures des mocks écrits à la main : des réponses réelles, copiées une fois depuis l'API.
export const DOSSIER = path.join(__dirname, '../strategies/mocks-manuels/donnees');
export const HAR = path.join(__dirname, '../strategies/har/trafic.har');

export type Reponse = { statut: number; corps: unknown };

// Quelle fixture répond à quelle requête : la même règle sert à les enregistrer et à les rejouer.
export function nomDeFixture(methode: string, chemin: string, corps: Record<string, unknown> | null): string | null {
  if (chemin === '/users/me') return 'utilisateur';
  if (chemin === '/brands') return 'marques';
  if (chemin === '/categories/tree') return 'categories';
  if (chemin === '/product-specs/names') return 'specs';
  if (chemin === '/products/search') return 'recherche';
  if (chemin === '/products') {
    if (corps?.['by_category']) return 'produits-par-categorie';
    return corps?.['page'] === '2' ? 'produits-page-2' : 'produits-page-1';
  }
  if (/^\/products\/[^/]+\/related$/.test(chemin)) return 'produits-lies';
  if (/^\/products\/[^/]+$/.test(chemin)) return 'produit';
  if (methode === 'POST' && chemin === '/carts') return 'panier-cree';
  if (methode === 'POST' && /^\/carts\/[^/]+$/.test(chemin)) return 'panier-article';
  return null;
}

export const lire = (nom: string): Reponse => JSON.parse(fs.readFileSync(path.join(DOSSIER, `${nom}.json`), 'utf8'));
export const ecrire = (nom: string, r: Reponse) => {
  fs.mkdirSync(DOSSIER, { recursive: true });
  fs.writeFileSync(path.join(DOSSIER, `${nom}.json`), JSON.stringify(r, null, 2) + '\n');
};
