import { test, type Page } from '@playwright/test';
import { CLIENT } from './comptes';

export const ETAPE_CONNEXION = 'Connexion par l’interface';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async seConnecter(compte = CLIENT) {
    await test.step(ETAPE_CONNEXION, async () => {
      await this.page.goto('/auth/login');
      await this.page.getByTestId('email').fill(compte.email);
      await this.page.getByTestId('password').fill(compte.motDePasse);
      await this.page.getByTestId('login-submit').click();
      await this.page.waitForURL('**/account');
    });
  }
}
