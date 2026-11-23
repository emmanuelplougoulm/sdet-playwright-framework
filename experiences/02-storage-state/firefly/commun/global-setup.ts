import { request } from '@playwright/test';
import { FIREFLY, UTILISATEUR } from './comptes';

// Crée le compte de test s'il n'existe pas encore (premier lancement sur une instance neuve).
export default async function globalSetup() {
  const http = await request.newContext({ baseURL: FIREFLY });
  const csrf = (await (await http.get('/register')).text()).match(/name="_token" value="([^"]+)"/)?.[1];
  if (csrf) {
    await http.post('/register', {
      form: { _token: csrf, email: UTILISATEUR.email, password: UTILISATEUR.motDePasse, password_confirmation: UTILISATEUR.motDePasse },
      maxRedirects: 0,
    });
  }
  await http.dispose();
}
