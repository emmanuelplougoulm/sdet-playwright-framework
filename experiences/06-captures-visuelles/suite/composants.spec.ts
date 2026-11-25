import { test, expect } from '@playwright/test';
import { ouvrir, type Ecran } from './ecrans';

// Stratégie D : une capture par composant, au pixel près.
const COMPOSANTS: Array<{ nom: string; ecran: Ecran; selecteur: string; bureauSeulement?: boolean }> = [
  { nom: 'en-tete', ecran: 'accueil', selecteur: 'nav.navbar' },
  // Sur mobile, les filtres sont repliés derrière un bouton : il n'y a rien à capturer.
  { nom: 'filtres', ecran: 'accueil', selecteur: '#filters', bureauSeulement: true },
  { nom: 'carte-produit', ecran: 'accueil', selecteur: 'a.card >> nth=0' },
  { nom: 'bloc-fiche', ecran: 'fiche', selecteur: '.row.my-3 >> nth=0' },
  { nom: 'formulaire-contact', ecran: 'contact', selecteur: '.auth-form' },
];

for (const c of COMPOSANTS) {
  test(c.nom, async ({ page, isMobile }) => {
    test.skip(Boolean(c.bureauSeulement && isMobile), 'replié sur mobile');
    await ouvrir(page, c.ecran);
    await expect(page.locator(c.selecteur)).toHaveScreenshot(`${c.nom}.png`);
  });
}
