import { expect, test, type Page } from '@playwright/test';
import { UTILISATEUR } from './comptes';
import { noter } from './compteur';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async seConnecter(compte = UTILISATEUR) {
    await test.step('Connexion par l’interface', async () => {
      noter('connexion-ui');
      await this.page.goto('/login');
      await this.page.locator('input[name="email"]').fill(compte.email);
      await this.page.locator('input[name="password"]').fill(compte.motDePasse);
      await this.page.locator('form[action$="/login"] button[type="submit"]').click();
      await expect(this.page).not.toHaveURL(/\/login/);
    });
  }
}
