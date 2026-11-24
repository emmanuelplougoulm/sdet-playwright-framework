import type { Expect, Page } from '@playwright/test';
import type { Ecrans } from './ecrans';
import { PINCES_COMBINEES } from './donnees';

type Corps = (page: Page, e: Ecrans, expect: Expect) => Promise<void>;

// Les 5 cas de la suite, identiques pour les quatre stratégies : seuls les locators changent.
export const CAS: Array<{ titre: string; corps: Corps }> = [
  { titre: 'la recherche ne garde que les pinces', corps: async (page, e, expect) => {
    await page.goto('/');
    await expect(e.carteProduit('Thor Hammer')).toBeVisible();
    await e.champRecherche.fill('pliers');
    await e.boutonRecherche.click();
    await expect(e.carteProduit('Long Nose Pliers')).toBeVisible();
    await expect(e.carteProduit('Thor Hammer')).toHaveCount(0);
  } },
  { titre: 'le filtre par catégorie ne garde que les marteaux', corps: async (page, e, expect) => {
    await page.goto('/');
    await expect(e.carteProduit('Long Nose Pliers')).toBeVisible();
    await e.caseCategorie('Hammer').check();
    await expect(e.carteProduit('Thor Hammer')).toBeVisible();
    await expect(e.carteProduit('Long Nose Pliers')).toHaveCount(0);
  } },
  { titre: 'la fiche reprend le nom et le prix du produit', corps: async (page, e, expect) => {
    await page.goto('/');
    await e.carteProduit('Combination Pliers').click();
    await expect(e.titreFiche('Combination Pliers')).toHaveText('Combination Pliers');
    await expect(e.prixFiche('14.15')).toHaveText('14.15');
  } },
  { titre: 'un produit s’ajoute au panier', corps: async (page, e, expect) => {
    await page.goto(`/product/${PINCES_COMBINEES}`);
    await e.boutonAjouter.click();
    await expect(e.quantitePanier).toHaveText('1');
  } },
  { titre: 'le menu mène à la page Contact', corps: async (page, e, expect) => {
    await page.goto('/');
    await e.lienContact.click();
    await expect(e.titreContact).toBeVisible();
  } },
];
