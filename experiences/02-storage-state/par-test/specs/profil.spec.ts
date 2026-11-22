import { test, expect } from '../fixtures';
import { CLIENT } from '../../commun/comptes';

test('le profil affiche l’e-mail du compte', async ({ compte }) => {
  await compte.ouvrir('profile');
  await expect(compte.email).toHaveValue(CLIENT.email);
});

test('le profil propose de changer le mot de passe', async ({ compte }) => {
  await compte.ouvrir('profile');
  await expect(compte.motDePasseActuel).toBeVisible();
});
