import { test as setup } from '@playwright/test';
import { LoginPage } from '../commun/LoginPage';
import { SESSION } from './chemin';

setup('connexion du client', async ({ page }) => {
  await new LoginPage(page).seConnecter();
  await page.context().storageState({ path: SESSION });
});
