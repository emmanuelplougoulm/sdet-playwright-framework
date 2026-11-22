import type { Locator, Page } from '@playwright/test';

export class AccountPage {
  readonly titre: Locator;
  readonly email: Locator;
  readonly motDePasseActuel: Locator;

  constructor(private readonly page: Page) {
    this.titre = page.getByTestId('page-title');
    this.email = page.getByTestId('email');
    this.motDePasseActuel = page.getByTestId('current-password');
  }

  async ouvrir(section: '' | 'favorites' | 'profile' | 'invoices' | 'messages' = '') {
    await this.page.goto(`/account/${section}`);
  }

  async allerVers(lien: 'favorites' | 'profile' | 'invoices' | 'messages') {
    await this.page.getByTestId(`nav-${lien}`).click();
  }
}
