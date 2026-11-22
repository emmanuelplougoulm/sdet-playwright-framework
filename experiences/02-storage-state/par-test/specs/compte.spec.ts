import { test, expect } from '../fixtures';

test('la page Mon compte s’affiche', async ({ compte }) => {
  await compte.ouvrir();
  await expect(compte.titre).toHaveText('My account');
});

test('Mon compte mène aux favoris', async ({ compte }) => {
  await compte.ouvrir();
  await compte.allerVers('favorites');
  await expect(compte.titre).toHaveText('Favorites');
});
