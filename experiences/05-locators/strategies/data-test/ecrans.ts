import type { Page } from '@playwright/test';
import type { Ecrans } from '../../commun/ecrans';
import { CATEGORIES, exactement } from '../../commun/donnees';

// D · Les attributs data-test, posés pour les tests.
export const ecrans = (page: Page): Ecrans => ({
  champRecherche: page.getByTestId('search-query'),
  boutonRecherche: page.getByTestId('search-submit'),
  carteProduit: (nom) => page.getByTestId('product-name').filter({ hasText: exactement(nom) }),
  caseCategorie: (nom) => page.getByTestId(`category-${CATEGORIES[nom]}`),
  titreFiche: () => page.getByTestId('product-name'),
  prixFiche: () => page.getByTestId('unit-price'),
  boutonAjouter: page.getByTestId('add-to-cart'),
  quantitePanier: page.getByTestId('cart-quantity'),
  lienContact: page.getByTestId('nav-contact'),
  // Repli : le titre de la page Contact n'a pas d'attribut data-test.
  titreContact: page.getByRole('heading', { name: 'Contact' }),
});
