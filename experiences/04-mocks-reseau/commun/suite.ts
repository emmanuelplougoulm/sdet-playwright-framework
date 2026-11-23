import type { Expect, Page } from '@playwright/test';
import { Catalogue, Fiche } from './pages';

type Corps = (page: Page, expect: Expect) => Promise<void>;

// Les 6 cas de la suite, identiques pour les trois stratégies d'interface.
// Chaque spec déclare lui-même ses tests (--only-changed, voir l'expérience 02).
export const CAS: Array<{ titre: string; corps: Corps }> = [
  { titre: 'l’accueil affiche 9 produits avec un nom et un prix', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    await expect(catalogue.noms).toHaveCount(9);
    for (const nom of await catalogue.textes(catalogue.noms)) expect(nom).not.toBe('');
    for (const prix of await catalogue.textes(catalogue.prix)) expect(prix).toMatch(/^\$\d+\.\d{2}$/);
  } },
  { titre: 'la recherche ne garde que les produits correspondants', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    await catalogue.chercher('pliers');
    await expect(page.getByTestId('search-caption')).toContainText('pliers');
    await expect(async () => {
      const noms = await catalogue.textes(catalogue.noms);
      expect(noms.length).toBeGreaterThan(0);
      for (const nom of noms) expect(nom).toMatch(/pliers/i);
    }).toPass({ timeout: 5_000 });
  } },
  { titre: 'le filtre par catégorie ne garde que les marteaux', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    await catalogue.filtrerParCategorie('Hammer');
    await expect(async () => {
      const noms = await catalogue.textes(catalogue.noms);
      expect(noms.length).toBeGreaterThan(0);
      for (const nom of noms) expect(nom).toMatch(/hammer/i);
    }).toPass({ timeout: 5_000 });
  } },
  { titre: 'la page 2 affiche d’autres produits', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    const page1 = await catalogue.textes(catalogue.noms);
    await catalogue.pageSuivante();
    await expect(async () => {
      const page2 = await catalogue.textes(catalogue.noms);
      expect(page2.length).toBeGreaterThan(0);
      expect(page2.filter((n) => page1.includes(n))).toEqual([]);
    }).toPass({ timeout: 5_000 });
  } },
  { titre: 'la fiche produit reprend le nom et le prix de la carte', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    const nom = (await catalogue.noms.first().textContent())!.trim();
    const prix = (await catalogue.prix.first().textContent())!.trim();
    await catalogue.noms.first().click();
    const fiche = new Fiche(page);
    await expect(fiche.nom).toHaveText(nom);
    await expect(fiche.prix).toHaveText(prix.replace('$', ''));
  } },
  { titre: 'un produit en stock s’ajoute au panier', corps: async (page, expect) => {
    const catalogue = new Catalogue(page);
    await catalogue.ouvrir();
    await catalogue.noms.first().click();
    const fiche = new Fiche(page);
    await fiche.ajouterAuPanier.click();
    await expect(fiche.quantitePanier).toHaveText('1');
  } },
];
