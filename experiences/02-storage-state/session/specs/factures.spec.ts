import { test, expect } from '../fixtures';

test('la page Factures s’affiche', async ({ compte }) => {
  await compte.ouvrir('invoices');
  await expect(compte.titre).toHaveText('Invoices');
});

test('Mon compte mène aux factures', async ({ compte }) => {
  await compte.ouvrir();
  await compte.allerVers('invoices');
  await expect(compte.titre).toHaveText('Invoices');
});
