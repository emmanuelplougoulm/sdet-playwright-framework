import { test, expect } from '@playwright/test';
import { API } from '../../commun/adresses';
import { lire } from '../../commun/fixtures-donnees';
import { ecartsDeForme } from '../../commun/forme';

// D (avec les mocks de B) · Des tests d'API vérifient que la vraie API répond encore
// avec la forme des fixtures : mêmes clés, mêmes types. Ils gardent les mocks honnêtes.
const APPELS: Array<{ fixture: string; methode: string; chemin: string; corps?: object }> = [
  { fixture: 'produits-page-1', methode: 'QUERY', chemin: '/products', corps: { page: '1' } },
  { fixture: 'recherche', methode: 'QUERY', chemin: '/products/search', corps: { q: 'pliers' } },
  { fixture: 'categories', methode: 'GET', chemin: '/categories/tree' },
  { fixture: 'marques', methode: 'GET', chemin: '/brands' },
];

for (const appel of APPELS) {
  test(`la réponse de ${appel.methode} ${appel.chemin} a la forme de la fixture « ${appel.fixture} »`, async ({ request }) => {
    const r = await request.fetch(`${API}${appel.chemin}`, { method: appel.methode, data: appel.corps, headers: { 'content-type': 'application/json' } });
    const fixture = lire(appel.fixture);
    expect(r.status()).toBe(fixture.statut);
    expect(ecartsDeForme(fixture.corps, await r.json())).toEqual([]);
  });
}

test('le filtre par catégorie a la forme de la fixture « produits-par-categorie »', async ({ request }) => {
  const arbre: Array<{ id: string; name: string; sub_categories: Array<{ id: string; name: string }> }> = await (await request.get(`${API}/categories/tree`)).json();
  const marteaux = arbre.flatMap((c) => c.sub_categories).find((c) => c.name === 'Hammer')!;
  const r = await request.fetch(`${API}/products`, { method: 'QUERY', data: { page: '1', by_category: marteaux.id } });
  expect(r.status()).toBe(200);
  expect(ecartsDeForme(lire('produits-par-categorie').corps, await r.json())).toEqual([]);
});

test('la fiche d’un produit a la forme de la fixture « produit »', async ({ request }) => {
  const liste = await (await request.fetch(`${API}/products`, { method: 'QUERY', data: { page: '1' } })).json();
  const r = await request.get(`${API}/products/${liste.data[0].id}`);
  expect(r.status()).toBe(200);
  expect(ecartsDeForme(lire('produit').corps, await r.json())).toEqual([]);
});

test('l’ajout au panier a la forme des fixtures « panier »', async ({ request }) => {
  const liste = await (await request.fetch(`${API}/products`, { method: 'QUERY', data: { page: '1' } })).json();
  const panier = await request.post(`${API}/carts`);
  expect(ecartsDeForme(lire('panier-cree').corps, await panier.json())).toEqual([]);
  const ajout = await request.post(`${API}/carts/${(await panier.json()).id}`, { data: { product_id: liste.data[0].id, quantity: 1 } });
  expect(ajout.status()).toBe(lire('panier-article').statut);
  expect(ecartsDeForme(lire('panier-article').corps, await ajout.json())).toEqual([]);
});
