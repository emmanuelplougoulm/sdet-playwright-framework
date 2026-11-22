import { test as base } from '@playwright/test';
import { SearchBar } from '../components/SearchBar';

export const test = base.extend<{ search: SearchBar }>({
  search: async ({ page }, use) => {
    await use(new SearchBar(page));
  },
});
