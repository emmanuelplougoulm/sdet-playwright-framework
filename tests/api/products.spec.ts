import { test, expect } from '@playwright/test';

test.describe('API /products', () => {
  test('renvoie une liste paginée', async ({ request }) => {
    const response = await request.get('/products', { params: { page: 1 } });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.current_page).toBe(1);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String), price: expect.any(Number) }),
    );
  });

  test('renvoie 404 pour un produit inexistant', async ({ request }) => {
    const response = await request.get('/products/inexistant');
    expect(response.status()).toBe(404);
  });
});
