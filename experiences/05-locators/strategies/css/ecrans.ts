import type { Page } from '@playwright/test';
import type { Ecrans } from '../../commun/ecrans';
import { CATEGORIES, exactement } from '../../commun/donnees';

// A · Sélecteurs CSS : classes et structure du HTML, comme on les écrit depuis les outils du navigateur.
export const ecrans = (page: Page): Ecrans => ({
  champRecherche: page.locator('form .input-group input.form-control'),
  boutonRecherche: page.locator('form .input-group button.btn-secondary'),
  carteProduit: (nom) => page.locator('.card-body h5.card-title').filter({ hasText: exactement(nom) }),
  caseCategorie: (nom) => page.locator(`input.icheck[value="${CATEGORIES[nom]}"]`),
  titreFiche: () => page.locator('app-detail h1'),
  prixFiche: () => page.locator('.price-section span > span'),
  boutonAjouter: page.locator('button.btn-success'),
  quantitePanier: page.locator('.nav-link .badge'),
  lienContact: page.locator('a.nav-link[href="/contact"]'),
  titreContact: page.locator('app-contact h3'),
});
