import { test, expect } from './fixtures';
import { casDeLaSuite } from '../../commun/suite';

for (const { titre, corps } of casDeLaSuite()) {
  test(titre, async ({ firefly, donnees, page }) => corps({ firefly, donnees, page }, expect));
}
