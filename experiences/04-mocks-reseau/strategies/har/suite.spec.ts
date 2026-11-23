import { test, expect } from './fixtures';
import { CAS } from '../../commun/suite';

for (const { titre, corps } of CAS) {
  test(titre, async ({ page }) => corps(page, expect));
}
