import type { Locator, Page } from '@playwright/test';
import { CLE_JETON } from './comptes';
import { noter } from './compteur';

export class AccountPage {
  readonly titre: Locator;
  readonly email: Locator;
  readonly motDePasseActuel: Locator;

  constructor(readonly page: Page) {
    this.titre = page.getByTestId('page-title');
    this.email = page.getByTestId('email');
    this.motDePasseActuel = page.getByTestId('current-password');
    // L'application rafraîchit elle-même un jeton expiré : on compte ces appels.
    page.on('request', (r) => {
      if (r.url().includes('/users/refresh')) noter('rafraichissement');
    });
  }

  async ouvrir(section: '' | 'favorites' | 'profile' | 'invoices' | 'messages' = '') {
    await this.page.goto(`/account/${section}`);
  }

  async allerVers(lien: 'favorites' | 'profile' | 'invoices' | 'messages') {
    await this.page.getByTestId(`nav-${lien}`).click();
  }

  async jeton(): Promise<string> {
    return (await this.page.evaluate((cle) => localStorage.getItem(cle), CLE_JETON)) ?? '';
  }
}
