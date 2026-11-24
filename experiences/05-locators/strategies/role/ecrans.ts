import type { Page } from '@playwright/test';
import type { Ecrans } from '../../commun/ecrans';

// C · Les rôles et les noms accessibles, comme les voit un lecteur d'écran.
export const ecrans = (page: Page): Ecrans => ({
  champRecherche: page.getByRole('textbox', { name: 'Search' }),
  boutonRecherche: page.getByRole('button', { name: 'Search' }),
  carteProduit: (nom) => page.getByRole('link', { name: nom }),
  caseCategorie: (nom) => page.getByRole('checkbox', { name: nom, exact: true }),
  titreFiche: () => page.getByRole('heading', { level: 1 }),
  // Le prix n'a pas de rôle : son aria-label lui donne un nom accessible.
  prixFiche: () => page.getByLabel('unit-price'),
  boutonAjouter: page.getByRole('button', { name: 'Add to cart' }),
  quantitePanier: page.getByRole('link', { name: 'cart' }),
  lienContact: page.getByRole('link', { name: 'Contact' }),
  titreContact: page.getByRole('heading', { name: 'Contact' }),
});
