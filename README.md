# SDET Playwright Framework

[![Playwright Tests](https://github.com/emmanuelplougoulm/sdet-playwright-framework/actions/workflows/playwright.yml/badge.svg)](https://github.com/emmanuelplougoulm/sdet-playwright-framework/actions/workflows/playwright.yml)

Un labo public sur l'architecture du code de test : Playwright + TypeScript sur
[Practice Software Testing](https://practicesoftwaretesting.com) (application de démo faite pour s'entraîner).

L'idée : une solution d'automatisation de tests mérite la même rigueur que le logiciel qu'elle teste.
Chaque expérience compare des organisations du code sur les mêmes tests, et mesure la différence.

## Expériences

| # | Question | Résultats |
|---|---|---|
| 01 | [God object ou fixtures à la carte ?](experiences/01-god-object/) | Pour un même changement : 12 lignes à lire au lieu de 38, 2 tests relancés sur 8 au lieu de 8, durée inchangée |
| 02 | [Se connecter dans chaque test, ou une fois avec storageState ?](experiences/02-storage-state/) | Sur 200 tests : 2 fois plus rapide avec une session par worker qu'en passant par l'écran de connexion. Mais une session partagée transmet ses incidents : une déconnexion fait tomber jusqu'à 40 tests sur 40, une session expirée 23 sur 24 |
| 03 | [Données de test partagées, ou créées par chaque test ?](experiences/03-donnees-de-test/) | Un jeu partagé : 0 échec avec 1 worker, 10 sur 40 avec 4, sous forme de faux bugs. Une factory par worker : 0 échec, et 25 s au lieu de 45 s pour une factory par test sur 200 tests |
| 04 | [Mocker le réseau, ou tester contre le vrai backend ?](experiences/04-mocks-reseau/) | Sur 10 bugs injectés : 10 détectés contre le vrai backend, 1 avec des mocks écrits à la main, 4 avec mocks et tests de contrat. Les mocks divisent la durée par 2,5 |
| 05 | [CSS, texte, rôle ou data-test : quels locators résistent aux changements ?](experiences/05-locators/) | Sur 10 changements d'interface : le CSS casse sur un refactor invisible et deux retouches de style, le data-test ne voit aucune des 3 régressions d'accessibilité, les rôles en rattrapent 2 sans aucune fausse alerte sur les refactors |
| 06 | [Comparer des captures : quels défauts visuels rattrape-t-on, et à quel prix ?](experiences/06-captures-visuelles/) | Sur 7 défauts visuels et 4 sources de bruit : la capture stricte rattrape les 6 défauts de mise en page mais échoue sur 3 bruits sur 4, un seuil de 0,1 % suffit à perdre des prix illisibles, les masques les cachent, et aucune stratégie ne voit le focus supprimé |

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
- [x] Connexion avec `storageState` (projet `setup` + comptes de test du site)
- [ ] Panier et commande de bout en bout
- [x] Mock réseau avec `page.route()`
- [ ] Tests d'API : authentification, création, validation de schéma
- [x] Données de test générées (factory)
- [ ] Sharding dans GitHub Actions, exécution dans Docker
- [ ] Test de charge k6
- [ ] Accessibilité avec `@axe-core/playwright`
