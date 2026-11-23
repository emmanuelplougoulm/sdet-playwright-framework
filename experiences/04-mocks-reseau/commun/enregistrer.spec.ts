import { test, expect } from '@playwright/test';
import { API } from './adresses';
import { CAS } from './suite';
import { ecrire, HAR, nomDeFixture } from './fixtures-donnees';

// Enregistre, sur l'application sans bug, ce que rejoueront les deux stratégies à mocks :
// les fixtures des mocks écrits à la main, et le HAR complet du trafic vers l'API.
test('enregistrer le trafic de la suite', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext();
  await context.routeFromHAR(HAR, { url: `${API}/**`, update: true, updateContent: 'embed', updateMode: 'minimal' });
  const page = await context.newPage();
  const vues = new Set<string>();
  page.on('response', async (reponse) => {
    const requete = reponse.request();
    if (!requete.url().startsWith(API) || requete.method() === 'OPTIONS') return;
    const corps = requete.postData() ? JSON.parse(requete.postData()!) : null;
    const nom = nomDeFixture(requete.method(), new URL(requete.url()).pathname, corps);
    if (!nom || vues.has(nom)) return;
    vues.add(nom);
    ecrire(nom, { statut: reponse.status(), corps: await reponse.json().catch(() => null) });
  });
  for (const { corps } of CAS) await corps(page, expect);
  await page.waitForTimeout(1_000);
  await context.close();
  console.log(`fixtures enregistrées : ${[...vues].sort().join(', ')}`);
});
