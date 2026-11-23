import { request, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { FIREFLY, PREFIXE, UTILISATEUR } from './comptes';

type Cookies = Awaited<ReturnType<BrowserContext['cookies']>>;
export type Entite = { id: string; nom: string };
type Ressource = 'accounts' | 'categories' | 'tags';

const aujourdHui = () => new Date().toISOString().slice(0, 10);

// Client de l'API REST de Firefly III. Il réutilise une session web : Firefly accepte ses cookies
// sur /api/v1 avec l'en-tête X-CSRF-TOKEN, sans jeton OAuth à créer.
export class Firefly {
  private constructor(private readonly http: APIRequestContext, readonly cookies: Cookies) {}

  static async connecter(): Promise<Firefly> {
    const web = await request.newContext({ baseURL: FIREFLY });
    const csrf = (await (await web.get('/login')).text()).match(/name="_token" value="([^"]+)"/)?.[1];
    if (!csrf) throw new Error('Jeton CSRF introuvable sur /login');
    const reponse = await web.post('/login', { form: { _token: csrf, email: UTILISATEUR.email, password: UTILISATEUR.motDePasse }, maxRedirects: 0 });
    if (reponse.status() !== 302 || reponse.headers()['location']?.includes('/login')) throw new Error(`Connexion refusée : ${reponse.status()}`);
    const jeton = (await (await web.get('/')).text()).match(/name="csrf-token" content="([^"]+)"/)?.[1];
    const etat = await web.storageState();
    await web.dispose();
    const http = await request.newContext({
      baseURL: `${FIREFLY}/api/v1/`,
      storageState: etat,
      extraHTTPHeaders: { 'X-CSRF-TOKEN': jeton ?? '', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    return new Firefly(http, etat.cookies);
  }

  async fermer() { await this.http.dispose(); }

  private async appel(methode: 'get' | 'post' | 'put' | 'delete', chemin: string, data?: object) {
    const r = await this.http[methode](chemin, data ? { data } : undefined);
    if (!r.ok()) throw new Error(`API ${methode.toUpperCase()} ${chemin} : ${r.status()} ${(await r.text()).slice(0, 160)}`);
    return r.status() === 204 ? null : r.json();
  }

  async creerCompte(nom: string): Promise<Entite> {
    const r = await this.appel('post', 'accounts', {
      name: nom, type: 'asset', account_role: 'defaultAsset', opening_balance: '1000', opening_balance_date: '2026-01-01',
    });
    return { id: r.data.id, nom };
  }
  async creerCategorie(nom: string): Promise<Entite> { return { id: (await this.appel('post', 'categories', { name: nom })).data.id, nom }; }
  async creerTag(nom: string): Promise<Entite> { return { id: (await this.appel('post', 'tags', { tag: nom })).data.id, nom }; }
  async supprimer(ressource: Ressource, id: string) { await this.appel('delete', `${ressource}/${id}`); }

  async compte(id: string) { return (await this.appel('get', `accounts/${id}`)).data.attributes; }
  async solde(id: string) { return Number((await this.compte(id)).current_balance); }
  async modifierCompte(id: string, champs: { name?: string; active?: boolean }) { await this.appel('put', `accounts/${id}`, champs); }

  async depense(t: { compte: string; montant: number; description: string; categorie?: string; tag?: string }) {
    await this.appel('post', 'transactions', { transactions: [{
      type: 'withdrawal', date: aujourdHui(), amount: String(t.montant), description: t.description,
      source_id: t.compte, destination_name: `${PREFIXE} boulangerie`,
      ...(t.categorie ? { category_id: t.categorie } : {}), ...(t.tag ? { tags: [t.tag] } : {}),
    }] });
  }
  async revenu(t: { compte: string; montant: number; description: string }) {
    await this.appel('post', 'transactions', { transactions: [{
      type: 'deposit', date: aujourdHui(), amount: String(t.montant), description: t.description,
      source_name: `${PREFIXE} employeur`, destination_id: t.compte,
    }] });
  }
  async nombreDeTransactions(ressource: Ressource, id: string): Promise<number> {
    return (await this.appel('get', `${ressource}/${id}/transactions?limit=1`)).meta.pagination.total;
  }
  async derniereTransaction(compte: string): Promise<string> {
    return (await this.appel('get', `accounts/${compte}/transactions?limit=1`)).data[0]?.attributes.transactions[0].description;
  }

  // Liste les entités au préfixe de l'expérience (pour l'inventaire et le nettoyage).
  async aPrefixe(chemin: string, champ: string): Promise<string[]> {
    return (await this.appel('get', chemin)).data
      .filter((d: { attributes: Record<string, string> }) => d.attributes[champ]?.startsWith(PREFIXE))
      .map((d: { id: string }) => d.id);
  }

  // Ce qui reste en base : les entités au préfixe de l'expérience, et toutes les transactions.
  async inventaire() {
    return {
      comptes: (await this.aPrefixe('accounts?type=asset&limit=500', 'name')).length,
      categories: (await this.aPrefixe('categories?limit=500', 'name')).length,
      tags: (await this.aPrefixe('tags?limit=500', 'tag')).length,
      transactions: (await this.appel('get', 'transactions?limit=1')).meta.pagination.total as number,
    };
  }

  // Remet l'instance à zéro : supprime tout ce que l'expérience a créé.
  async nettoyer() {
    for (const [chemin, ressource, champ] of [
      ['accounts?limit=500', 'accounts', 'name'], ['categories?limit=500', 'categories', 'name'], ['tags?limit=500', 'tags', 'tag'],
    ] as const) {
      for (const id of await this.aPrefixe(chemin, champ)) await this.supprimer(ressource, id);
    }
  }
}
