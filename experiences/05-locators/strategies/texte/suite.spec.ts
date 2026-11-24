import { test, expect } from '@playwright/test';
import { ecrans } from './ecrans';
import { CAS } from '../../commun/suite';

for (const { titre, corps } of CAS) {
  test(titre, async ({ page }) => corps(page, ecrans(page), expect));
}
