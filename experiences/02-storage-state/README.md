# Expérience 02 · Se connecter dans chaque test, ou une fois avec storageState

**Question :** qu'est-ce que coûte une connexion par l'interface au début de chaque test, par rapport à une connexion faite une seule fois et réutilisée ?

## Le protocole

- **Deux versions** de la même suite : 8 tests sur l'espace client de [Practice Software Testing](https://practicesoftwaretesting.com), avec le compte de démo publié par le site.
  - `par-test/` : la fixture `compte` se connecte par l'écran de connexion avant chaque test.
  - `session/` : un projet `setup` se connecte une fois et enregistre la session (`storageState`). Les tests démarrent déjà connectés.
- **Seule la connexion change.** Les fichiers de spec sont identiques dans les deux versions (`diff -r par-test/specs session/specs` ne renvoie rien), et `LoginPage` comme `AccountPage` sont partagés dans `commun/`.
- **Les tests ne font que lire.** Ils ne modifient ni le profil ni les favoris, pour que le partage d'une même session ne fausse rien.
- **Trois mesures**, toutes produites par `measure.mjs` :
  1. la durée de la suite et le nombre de connexions, en médiane sur 5 runs avec un seul worker ;
  2. le coût d'un changement de l'écran de connexion : le bouton change d'attribut `data-test`. On compte les lignes modifiées et les tests relancés par `playwright test --only-changed` ;
  3. ce qui se passe quand la connexion casse : même changement, mais `LoginPage` n'est pas encore corrigé. On compte les échecs, les tests non exécutés et la durée du run rouge, avec 4 workers comme en CI et le timeout par défaut (30 s).

## Lancer

```bash
node experiences/02-storage-state/measure.mjs 5
```

Avec un Chromium déjà en cache : `PW_CHROMIUM=/chemin/vers/chrome-headless-shell node experiences/02-storage-state/measure.mjs 5`.
Les résultats bruts sont écrits dans `resultats.json`. Les connexions sont comptées par `mesure-reporter.ts`, un reporter Playwright qui repère l'étape « Connexion par l’interface » de `LoginPage`.

## Résultats (22/11/2026, Playwright 1.64.1)

| | Connexion dans chaque test | Connexion une fois (storageState) |
|---|---|---|
| Connexions par l'interface | 8 | 1 |
| Durée médiane (5 runs, 1 worker) | 8,4 s | 7,2 s |
| Écart des runs | 7,6 à 8,7 s | 6,8 à 7,4 s |
| **Changement de l'écran de connexion** | | |
| Fichiers modifiés | 1 | 1 |
| Lignes modifiées | 1 | 1 |
| Tests relancés (`--only-changed`) | 8 / 8 | 1 (le setup) |
| **Connexion cassée** | | |
| Tests en échec | 8 | 0 (le setup échoue) |
| Tests non exécutés | 0 | 8 |
| Durée du run rouge (4 workers) | 63 s | 31 s |
| **Coût du code** | | |
| Code propre à la version | 1 fichier, 11 lignes | 3 fichiers, 19 lignes |
| Lignes de config Playwright | 1 projet | 2 projets, dont 1 dépendance |

## Ce qu'on peut en dire

- **Le gain de temps est réel mais modeste ici** : 1,2 s sur 8 tests, soit environ 15 % et 150 ms par test. Les écarts des runs ne se chevauchent pas. Ce gain grandit avec le nombre de tests connectés, et avec la lenteur de l'écran de connexion (SSO, double authentification).
- **Le vrai gain est quand la connexion casse.** Avec une connexion par test, le rapport montre 8 échecs identiques, qui attendent chacun 30 s. Avec storageState, il montre 1 échec clair, celui du setup, et 8 tests non exécutés. Le run rouge dure deux fois moins longtemps, et la cause se lit tout de suite.
- **Les tests ne dépendent plus de l'écran de connexion.** Quand il change, seul le setup est relancé, au lieu de toute la suite. Les specs n'importent plus aucun code de connexion.
- **Le serveur reçoit 8 fois moins de connexions.** Sur un environnement de test partagé, ou avec une limite de tentatives, c'est ce qui évite les échecs intermittents.
- **Découper a un prix** : 2 fichiers de plus et une dépendance entre projets à comprendre. Un test lancé seul exécute aussi le setup.

## Limites

- Une petite suite (8 tests) : le gain de temps se mesure ici en secondes. Le nombre de connexions (1 au lieu de N) et le comportement en cas de panne, eux, restent vrais quelle que soit la taille.
- **Le temps passé dans l'étape de connexion n'est pas un bon indicateur.** `resultats.json` le donne (`msEtapeConnexionMedian` : 5,8 s contre 0,7 s), mais il inclut le premier chargement de l'application dans un navigateur neuf, que la version session paie aussi au début de chaque test. Le vrai coût, c'est l'écart de durée de la suite.
- Une seule session partagée ne convient qu'aux tests qui ne la modifient pas. Un test qui se déconnecte ou change le mot de passe doit avoir sa propre session.
- Le SUT est un site public : la durée dépend du réseau.
