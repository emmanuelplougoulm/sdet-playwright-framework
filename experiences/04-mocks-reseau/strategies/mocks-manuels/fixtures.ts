import { test as base, expect } from '@playwright/test';
import { API } from '../../commun/adresses';
import { lire, nomDeFixture } from '../../commun/fixtures-donnees';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, QUERY, OPTIONS',
};

// B · Toutes les requêtes vers l'API sont servies par des fixtures JSON, choisies d'après le chemin
// et quelques critères du corps : c'est la forme habituelle d'un mock écrit à la main.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(`${API}/**`, async (route) => {
      const requete = route.request();
      if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const corps = requete.postData() ? JSON.parse(requete.postData()!) : null;
      const nom = nomDeFixture(requete.method(), new URL(requete.url()).pathname, corps);
      if (!nom) return route.fulfill({ status: 404, headers: CORS, json: { message: 'pas de mock' } });
      const { statut, corps: reponse } = lire(nom);
      await route.fulfill({ status: statut, headers: CORS, json: reponse });
    });
    await use(page);
  },
});
export { expect };
