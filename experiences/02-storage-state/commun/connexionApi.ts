import { request, type Page } from '@playwright/test';
import { API, CLE_JETON, CLIENT } from './comptes';
import { noter } from './compteur';

// Connexion sans navigateur : un POST sur l'API, qui renvoie un jeton JWT.
export async function connexionApi(compte = CLIENT): Promise<string> {
  noter('connexion-api');
  const api = await request.newContext({ baseURL: API });
  const reponse = await api.post('/users/login', { data: { email: compte.email, password: compte.motDePasse } });
  if (!reponse.ok()) throw new Error(`Connexion API refusée : ${reponse.status()}`);
  const { access_token } = await reponse.json();
  await api.dispose();
  return access_token;
}

// Pose le jeton dans le localStorage avant le premier chargement de la page, comme l'application le ferait.
export async function injecterJeton(page: Page, jeton: string) {
  await page.addInitScript(([cle, valeur]) => localStorage.setItem(cle, valeur), [CLE_JETON, jeton] as const);
}

// Révoque un jeton côté serveur (liste noire de l'API).
export async function revoquerJeton(jeton: string) {
  const api = await request.newContext({ baseURL: API });
  const reponse = await api.get('/users/logout', { headers: { Authorization: `Bearer ${jeton}` } });
  await api.dispose();
  return reponse.status();
}
