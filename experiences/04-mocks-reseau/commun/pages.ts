import type { Locator, Page } from '@playwright/test';

export class Catalogue {
  readonly noms: Locator;
  readonly prix: Locator;
  constructor(readonly page: Page) {
    this.noms = page.getByTestId('product-name');
    this.prix = page.getByTestId('product-price');
  }
  async ouvrir() {
    await this.page.goto('/');
    await this.noms.first().waitFor();
  }
  async chercher(terme: string) {
    await this.page.getByTestId('search-query').fill(terme);
    await this.page.getByTestId('search-submit').click();
  }
  async filtrerParCategorie(nom: string) {
    await this.page.getByLabel(nom, { exact: true }).check();
  }
  async pageSuivante() {
    await this.page.getByTestId('pagination-next').click();
  }
  async textes(locator: Locator) {
    return (await locator.allTextContents()).map((t) => t.trim());
  }
}

export class Fiche {
  readonly nom: Locator;
  readonly prix: Locator;
  readonly ajouterAuPanier: Locator;
  readonly quantitePanier: Locator;
  constructor(readonly page: Page) {
    this.nom = page.getByTestId('product-name');
    this.prix = page.getByTestId('unit-price');
    this.ajouterAuPanier = page.getByTestId('add-to-cart');
    this.quantitePanier = page.getByTestId('cart-quantity');
  }
}
