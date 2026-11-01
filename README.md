# SDET Playwright Framework

Projet fil rouge pour préparer les entretiens SDET : Playwright + TypeScript sur
[Practice Software Testing](https://practicesoftwaretesting.com) (application de démo faite pour s'entraîner).

## Démarrer

```bash
npm install
npx playwright install chromium
npm test
```

| Commande | Rôle |
|---|---|
| `npm test` | Tous les tests (UI + API) |
| `npm run test:ui` | Tests navigateur seulement |
| `npm run test:api` | Tests d'API seulement |
| `npm run report` | Ouvre le rapport HTML |
| `npm run typecheck` | Vérifie les types TypeScript |
| `npx playwright test --ui` | Mode interactif pour écrire et déboguer |

## Structure

```
pages/        Page Objects : un fichier par page, locators + actions
fixtures/     Fixtures Playwright qui injectent les Page Objects dans les tests
tests/ui/     Tests de bout en bout dans le navigateur
tests/api/    Tests de l'API REST (https://api.practicesoftwaretesting.com)
.github/      Pipeline GitHub Actions (tests + rapport en artefact)
```

## Feuille de route (liée au plan d'étude)

- [x] Bloc 3 : Page Objects, fixtures, locators `data-test`, tests UI
- [x] Bloc 4 : premiers tests d'API
- [ ] Connexion avec `storageState` (projet `setup` + comptes de test du site)
- [ ] Panier et commande de bout en bout
- [ ] Mock réseau avec `page.route()`
- [ ] Tests d'API : authentification, création, validation de schéma
- [ ] Données de test générées (factory)
- [ ] Bloc 5 : sharding dans GitHub Actions, exécution dans Docker
- [ ] Bloc 5 : test de charge k6
- [ ] Accessibilité avec `@axe-core/playwright`
