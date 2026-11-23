import { test, expect } from './fixtures';
import { casDeLaSuite } from '../../commun/suite';

for (const { titre, corps } of casDeLaSuite()) {
  test(titre, async ({ compte }) => corps(compte, expect));
}
