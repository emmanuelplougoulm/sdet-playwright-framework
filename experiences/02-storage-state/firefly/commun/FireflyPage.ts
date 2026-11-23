import type { Page } from '@playwright/test';

export type Rubrique = 'accounts/asset' | 'accounts/expense' | 'accounts/revenue' | 'budgets' | 'categories' | 'tags' | 'subscriptions';

export class FireflyPage {
  constructor(readonly page: Page) {}

  async ouvrir(rubrique: Rubrique) {
    await this.page.goto(`/${rubrique}`);
  }

  // Déconnexion par le lien du menu : Firefly invalide la session côté serveur.
  async seDeconnecter() {
    const csrf = await this.page.locator('meta[name="csrf-token"]').getAttribute('content');
    await this.page.request.post('/logout', { form: { _token: csrf ?? '' } });
  }
}
