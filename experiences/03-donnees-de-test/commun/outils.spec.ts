import fs from 'node:fs';
import { test } from '@playwright/test';
import { Firefly } from './api';

// Outil du script de mesure, hors suite : OUTIL=nettoyer remet l'instance à zéro,
// puis l'inventaire de ce qui reste en base est écrit dans OUTIL_SORTIE.
test('outil de mesure', async () => {
  const firefly = await Firefly.connecter();
  if (process.env['OUTIL'] === 'nettoyer') await firefly.nettoyer();
  fs.writeFileSync(process.env['OUTIL_SORTIE']!, JSON.stringify(await firefly.inventaire()));
  await firefly.fermer();
});
