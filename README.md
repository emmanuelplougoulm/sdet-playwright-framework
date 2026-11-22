# SDET Playwright Framework

Un labo public sur l'architecture du code de test : Playwright + TypeScript sur
[Practice Software Testing](https://practicesoftwaretesting.com) (application de démo faite pour s'entraîner).

L'idée : une solution d'automatisation de tests mérite la même rigueur que le logiciel qu'elle teste.
Chaque expérience compare des organisations du code sur les mêmes tests, et mesure la différence.

## Expériences

| # | Question | Résultats |
|---|---|---|
| 01 | [God object ou fixtures à la carte ?](experiences/01-god-object/) | Pour un même changement : 12 lignes à lire au lieu de 38, 2 tests relancés sur 8 au lieu de 8, durée inchangée |
| 02 | [Se connecter dans chaque test, ou une fois avec storageState ?](experiences/02-storage-state/) | 1 connexion au lieu de 8, 15 % plus rapide ; quand la connexion casse : 1 échec clair au lieu de 8, run rouge 2 fois plus court |

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
experiences/  Expériences mesurées, chacune avec son protocole, son script et ses résultats
.github/      Pipeline GitHub Actions (tests + rapport en artefact)
```

## Feuille de route

- [x] Page Objects, fixtures, locators `data-test`, tests UI
- [x] Premiers tests d'API
- [ ] Connexion avec `storageState` (projet `setup` + comptes de test du site)
- [ ] Panier et commande de bout en bout
- [ ] Mock réseau avec `page.route()`
- [ ] Tests d'API : authentification, création, validation de schéma
- [ ] Données de test générées (factory)
- [ ] Sharding dans GitHub Actions, exécution dans Docker
- [ ] Test de charge k6
- [ ] Accessibilité avec `@axe-core/playwright`
