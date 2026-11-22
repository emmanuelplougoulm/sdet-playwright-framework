# Expérience 01 · God object ou fixtures à la carte

**Question :** pour un même changement, qu'est-ce que coûte un God object par rapport à des fixtures découpées ?

## Le protocole

- **Deux versions** de la même suite : 8 tests identiques (mêmes scénarios, mêmes sélecteurs, mêmes assertions) sur [Practice Software Testing](https://practicesoftwaretesting.com).
  - `god/` : une classe `App` qui sait tout faire, injectée par une fixture unique `app`.
  - `split/` : une classe par responsabilité (`CatalogPage`, `ProductPage`, `SearchBar`, `Cart`), une fixture par domaine, combinées avec `mergeTests()` dans chaque spec.
- **Un seul changement**, appliqué de la même façon aux deux versions : le bouton « Ajouter au panier » change d'attribut `data-test`.
- **Quatre mesures**, toutes produites par `measure.mjs` :
  1. les lignes du fichier qu'il faut ouvrir pour faire la modification ;
  2. les fichiers et lignes modifiés (`git diff --numstat`) ;
  3. les tests relancés par `playwright test --only-changed`, qui suit le vrai graphe d'imports ;
  4. la durée de la suite, en médiane sur 5 runs avec un seul worker.

## Lancer

```bash
node experiences/01-god-object/measure.mjs 5
```

Avec un Chromium déjà en cache : `PW_CHROMIUM=/chemin/vers/chrome-headless-shell node experiences/01-god-object/measure.mjs 5`.
Les résultats bruts sont écrits dans `resultats.json`.

## Résultats (22/11/2026, Playwright 1.64.1)

| | God object | Fixtures à la carte |
|---|---|---|
| Lignes du fichier à ouvrir | 38 | 12 |
| Fichiers modifiés | 1 | 1 |
| Lignes modifiées | 1 | 1 |
| Tests relancés (`--only-changed`) | 8 / 8 | 2 / 8 |
| Fichiers de spec relancés | 4 / 4 | 1 / 4 |
| Fichiers au total | 6 | 12 |
| Lignes au total | 100 | 140 |
| Durée médiane (5 runs) | 7,9 s | 6,8 s |

## Ce qu'on peut en dire

- **La modification elle-même coûte pareil** : une ligne dans un fichier, dans les deux cas. Le God object centralise lui aussi.
- **La différence est dans le couplage.** Avec le God object, toute la suite dépend du code du panier : chaque changement relance 100 % des tests. Avec les fixtures, seuls les tests qui demandent `cart` sont concernés.
- **Il y a moins à lire** : 12 lignes au lieu de 38 pour trouver et comprendre ce qu'on modifie. L'écart grandit avec la taille de l'objet.
- **Découper a un prix** : 2 fois plus de fichiers et 40 % de lignes en plus, dus aux classes et fixtures supplémentaires.
- **La durée n'est pas un gain mesurable ici.** Les runs se chevauchent (6,4 à 9,1 s selon le réseau). Les deux versions font exactement le même travail à l'exécution.

## Limites

- Une petite suite (8 tests, 4 specs) : les proportions dépendent de la taille réelle d'une suite. Le 100 % de tests relancés du God object, lui, reste vrai quelle que soit la taille.
- Le SUT est un site public : la durée dépend du réseau.
