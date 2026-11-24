import type { Page } from '@playwright/test';
import type { Ecrans } from '../../commun/ecrans';

// B · Le texte visible (et le placeholder). « Search », « Hammer » et « Contact » apparaissent plusieurs fois :
// trois locators choisissent l'élément par sa position.
export const ecrans = (page: Page): Ecrans => ({
  champRecherche: page.getByPlaceholder('Search'),
  boutonRecherche: page.getByText('Search', { exact: true }).last(),
  carteProduit: (nom) => page.getByText(nom, { exact: true }),
  caseCategorie: (nom) => page.getByText(nom, { exact: true }).first(),
  titreFiche: (nom) => page.getByText(nom, { exact: true }),
  prixFiche: (prix) => page.getByText(prix, { exact: true }),
  boutonAjouter: page.getByText('Add to cart', { exact: true }),
  // Repli : le lien du panier n'a pas de texte visible (une icône et un nombre).
  quantitePanier: page.getByRole('link', { name: 'cart' }),
  lienContact: page.getByText('Contact', { exact: true }),
  titreContact: page.getByText('Contact', { exact: true }).nth(1),
});
