import type { Expect } from '@playwright/test';
import { CLIENT } from './comptes';
import { revoquerJeton } from './connexionApi';
import type { AccountPage } from './AccountPage';

// Les 8 cas de base : ils ne font que lire l'espace client.
const CAS: Array<[string, (compte: AccountPage, expect: Expect) => Promise<void>]> = [
  ['la page Mon compte s’affiche', async (c, expect) => { await c.ouvrir(); await expect(c.titre).toHaveText('My account'); }],
  ['Mon compte mène aux favoris', async (c, expect) => { await c.ouvrir(); await c.allerVers('favorites'); await expect(c.titre).toHaveText('Favorites'); }],
  ['la page Factures s’affiche', async (c, expect) => { await c.ouvrir('invoices'); await expect(c.titre).toHaveText('Invoices'); }],
  ['Mon compte mène aux factures', async (c, expect) => { await c.ouvrir(); await c.allerVers('invoices'); await expect(c.titre).toHaveText('Invoices'); }],
  ['la page Messages s’affiche', async (c, expect) => { await c.ouvrir('messages'); await expect(c.titre).toHaveText('Messages'); }],
  ['Mon compte mène au profil', async (c, expect) => { await c.ouvrir(); await c.allerVers('profile'); await expect(c.titre).toHaveText('Profile'); }],
  ['le profil affiche l’e-mail du compte', async (c, expect) => { await c.ouvrir('profile'); await expect(c.email).toHaveValue(CLIENT.email); }],
  ['le profil propose de changer le mot de passe', async (c, expect) => { await c.ouvrir('profile'); await expect(c.motDePasseActuel).toBeVisible(); }],
];

// La même suite pour toutes les stratégies. Sa taille vient de SUITE_TAILLE (8, 24, 48…) :
// les 8 cas sont répétés en « séries », comme une suite qui grandit avec le produit.
// Avec SUITE_REVOCATION=1, un test d'API révoque son jeton au début de la suite,
// comme le ferait un test du endpoint de déconnexion.
// Chaque spec déclare lui-même ses tests avec ces cas : --only-changed choisit les tests
// d'après le fichier qui appelle test(), et ignorerait des tests déclarés ici.
export function casDeLaSuite(): Array<{ titre: string; corps: (compte: AccountPage, expect: Expect) => Promise<void> }> {
  const cas = [];
  if (process.env['SUITE_REVOCATION'] === '1') {
    cas.push({
      titre: 'l’API révoque le jeton à la déconnexion',
      corps: async (compte: AccountPage, expect: Expect) => {
        await compte.ouvrir();
        expect(await revoquerJeton(await compte.jeton())).toBe(200);
      },
    });
  }
  const taille = Number(process.env['SUITE_TAILLE'] ?? 8);
  for (let serie = 1; serie <= Math.ceil(taille / CAS.length); serie++) {
    for (const [titre, corps] of CAS.slice(0, taille - (serie - 1) * CAS.length)) {
      cas.push({ titre: `${titre} · série ${serie}`, corps });
    }
  }
  return cas;
}
