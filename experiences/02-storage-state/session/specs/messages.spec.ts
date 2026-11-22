import { test, expect } from '../fixtures';

test('la page Messages s’affiche', async ({ compte }) => {
  await compte.ouvrir('messages');
  await expect(compte.titre).toHaveText('Messages');
});

test('Mon compte mène au profil', async ({ compte }) => {
  await compte.ouvrir();
  await compte.allerVers('profile');
  await expect(compte.titre).toHaveText('Profile');
});
