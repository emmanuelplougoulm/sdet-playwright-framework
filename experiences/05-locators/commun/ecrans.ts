import type { Locator } from '@playwright/test';

// Ce que la suite manipule. Chaque stratégie l'implémente avec un seul type de locator ;
// quand un élément n'offre aucune prise à ce type, elle se rabat sur un autre, et le dit (« repli »).
export interface Ecrans {
  champRecherche: Locator;
  boutonRecherche: Locator;
  carteProduit(nom: string): Locator;
  caseCategorie(nom: string): Locator;
  titreFiche(nom: string): Locator;
  prixFiche(prix: string): Locator;
  boutonAjouter: Locator;
  quantitePanier: Locator;
  lienContact: Locator;
  titreContact: Locator;
}
