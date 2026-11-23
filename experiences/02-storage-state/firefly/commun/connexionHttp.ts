import { request, type BrowserContext } from '@playwright/test';
import { FIREFLY, UTILISATEUR } from './comptes';
import { noter } from './compteur';

type Cookies = Awaited<ReturnType<BrowserContext['cookies']>>;

// Connexion sans navigateur : on récupère le jeton CSRF du formulaire, puis on poste le formulaire.
// Firefly répond par un cookie de session, qu'on copiera dans le navigateur du test.
export async function connexionHttp(compte = UTILISATEUR): Promise<Cookies> {
  noter('connexion-http');
  const http = await request.newContext({ baseURL: FIREFLY });
  const page = await (await http.get('/login')).text();
  const csrf = page.match(/name="_token" value="([^"]+)"/)?.[1];
  if (!csrf) throw new Error('Jeton CSRF introuvable sur /login');
  const reponse = await http.post('/login', {
    form: { _token: csrf, email: compte.email, password: compte.motDePasse },
    maxRedirects: 0,
  });
  if (reponse.status() !== 302 || reponse.headers()['location']?.includes('/login')) {
    throw new Error(`Connexion HTTP refusée : ${reponse.status()} ${reponse.headers()['location'] ?? ''}`);
  }
  const { cookies } = await http.storageState();
  await http.dispose();
  return cookies;
}

export async function poserCookies(context: BrowserContext, cookies: Cookies) {
  await context.addCookies(cookies);
}
