import type { Expect, Page } from '@playwright/test';
import type { Firefly } from './api';
import { PREFIXE } from './comptes';
import { unique, type Donnees } from './donnees';

type Contexte = { firefly: Firefly; donnees: Donnees; page: Page };
type Corps = (c: Contexte, expect: Expect) => Promise<void>;

// Les 8 cas de base. Chacun écrit puis relit, avec des assertions relatives (avant / après)
// et une remise en état dans un finally : c'est la version soignée d'une suite à données partagées.
const CAS: Array<[string, Corps]> = [
  ['une dépense diminue le solde du compte', async ({ firefly, donnees: { compte } }, expect) => {
    const avant = await firefly.solde(compte.id);
    await firefly.depense({ compte: compte.id, montant: 12.5, description: `${PREFIXE} dépense ${unique()}` });
    expect(await firefly.solde(compte.id)).toBeCloseTo(avant - 12.5, 2);
  }],
  ['un revenu augmente le solde du compte', async ({ firefly, donnees: { compte } }, expect) => {
    const avant = await firefly.solde(compte.id);
    await firefly.revenu({ compte: compte.id, montant: 40, description: `${PREFIXE} revenu ${unique()}` });
    expect(await firefly.solde(compte.id)).toBeCloseTo(avant + 40, 2);
  }],
  ['la dernière transaction du compte est la nouvelle', async ({ firefly, donnees: { compte } }, expect) => {
    const description = `${PREFIXE} achat ${unique()}`;
    await firefly.depense({ compte: compte.id, montant: 3, description });
    expect(await firefly.derniereTransaction(compte.id)).toBe(description);
  }],
  ['renommer le compte change son nom', async ({ firefly, donnees: { compte } }, expect) => {
    try {
      await firefly.modifierCompte(compte.id, { name: `${compte.nom} (renommé)` });
      expect((await firefly.compte(compte.id)).name).toBe(`${compte.nom} (renommé)`);
    } finally {
      await firefly.modifierCompte(compte.id, { name: compte.nom });
    }
  }],
  ['une dépense catégorisée compte dans sa catégorie', async ({ firefly, donnees: { compte, categorie } }, expect) => {
    const avant = await firefly.nombreDeTransactions('categories', categorie.id);
    await firefly.depense({ compte: compte.id, montant: 7, description: `${PREFIXE} courses ${unique()}`, categorie: categorie.id });
    expect(await firefly.nombreDeTransactions('categories', categorie.id)).toBe(avant + 1);
  }],
  ['une dépense taguée compte dans son tag', async ({ firefly, donnees: { compte, tag } }, expect) => {
    const avant = await firefly.nombreDeTransactions('tags', tag.id);
    await firefly.depense({ compte: compte.id, montant: 9, description: `${PREFIXE} sortie ${unique()}`, tag: tag.nom });
    expect(await firefly.nombreDeTransactions('tags', tag.id)).toBe(avant + 1);
  }],
  ['la page du compte affiche son nom', async ({ page, donnees: { compte } }, expect) => {
    await page.goto(`/accounts/show/${compte.id}`);
    await expect(page.getByRole('heading', { level: 3, name: `for account ${compte.nom} between` })).toBeVisible();
  }],
  ['archiver le compte le rend inactif', async ({ firefly, donnees: { compte } }, expect) => {
    try {
      await firefly.modifierCompte(compte.id, { active: false });
      expect((await firefly.compte(compte.id)).active).toBe(false);
    } finally {
      await firefly.modifierCompte(compte.id, { active: true });
    }
  }],
];

// La même suite pour les trois stratégies, déclarée par chaque spec (--only-changed choisit
// les tests d'après le fichier qui appelle test(), voir l'expérience 02). Sa taille vient de SUITE_TAILLE.
// Avec SUITE_SABOTAGE=1, un test échoue au milieu de son travail, avant de remettre sa donnée en état,
// comme un test interrompu par un bug ou un timeout.
export function casDeLaSuite(): Array<{ titre: string; corps: Corps }> {
  const cas: Array<{ titre: string; corps: Corps }> = [];
  if (process.env['SUITE_SABOTAGE'] === '1') {
    cas.push({
      titre: 'un test échoue avant de remettre le compte en état',
      corps: async ({ firefly, donnees: { compte } }, expect) => {
        await firefly.modifierCompte(compte.id, { name: `${compte.nom} (modifié)`, active: false });
        expect('le bug du test', 'échec volontaire avant la remise en état').toBe('corrigé');
        await firefly.modifierCompte(compte.id, { name: compte.nom, active: true });
      },
    });
  }
  const taille = Number(process.env['SUITE_TAILLE'] ?? 8);
  for (let i = 0; i < taille; i++) {
    const [titre, corps] = CAS[i % CAS.length]!;
    cas.push({ titre: `${titre} · ${Math.floor(i / CAS.length) + 1}`, corps });
  }
  return cas;
}
