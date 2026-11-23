import type { Expect } from '@playwright/test';
import type { FireflyPage, Rubrique } from './FireflyPage';

// Les 8 cas de base : ils ne font que lire. Le titre de l'onglet prouve qu'on est connecté :
// sans session, Firefly renvoie vers /login.
const CAS: Array<[string, Rubrique, RegExp]> = [
  ['les comptes d’actifs s’affichent', 'accounts/asset', /^Asset accounts/],
  ['les comptes de dépenses s’affichent', 'accounts/expense', /^Expense accounts/],
  ['les comptes de revenus s’affichent', 'accounts/revenue', /^Revenue accounts/],
  ['les budgets s’affichent', 'budgets', /^Budgets/],
  ['les catégories s’affichent', 'categories', /^Categories/],
  ['les tags s’affichent', 'tags', /^Tags/],
  ['les abonnements s’affichent', 'subscriptions', /^Subscriptions/],
  ['les budgets s’affichent à nouveau', 'budgets', /^Budgets/],
];

// La même suite pour toutes les stratégies. Sa taille vient de SUITE_TAILLE (8, 40, 200…) :
// les 8 cas sont répétés en « séries », comme une suite qui grandit avec le produit.
// Avec SUITE_DECONNEXION=1, un test se déconnecte au début de la suite, comme un test de déconnexion.
// Chaque spec déclare lui-même ses tests avec ces cas : --only-changed choisit les tests
// d'après le fichier qui appelle test(), et ignorerait des tests déclarés ici.
export function casDeLaSuite(): Array<{ titre: string; corps: (firefly: FireflyPage, expect: Expect) => Promise<void> }> {
  const cas = [];
  if (process.env['SUITE_DECONNEXION'] === '1') {
    cas.push({
      titre: 'la déconnexion ferme la session',
      corps: async (firefly: FireflyPage, expect: Expect) => {
        await firefly.ouvrir('budgets');
        await firefly.seDeconnecter();
        await firefly.ouvrir('budgets');
        await expect(firefly.page).toHaveURL(/\/login/);
      },
    });
  }
  const taille = Number(process.env['SUITE_TAILLE'] ?? 8);
  for (let i = 0; i < taille; i++) {
    const [titre, rubrique, attendu] = CAS[i % CAS.length]!;
    cas.push({
      titre: `${titre} · ${Math.floor(i / CAS.length) + 1}`,
      corps: async (firefly: FireflyPage, expect: Expect) => {
        await firefly.ouvrir(rubrique);
        await expect(firefly.page).toHaveTitle(attendu);
      },
    });
  }
  return cas;
}
