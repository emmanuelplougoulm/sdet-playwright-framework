# Expérience 03 · Données de test partagées, ou créées par chaque test ?

**Question :** d'où doivent venir les données d'une suite qui écrit, quand elle tourne en parallèle, échoue en cours de route ou s'interrompt ?

## Les trois stratégies

Même suite, mêmes fichiers de spec ; seule la fixture `donnees` change. Chaque test reçoit un compte courant, une catégorie et un tag.

| | Stratégie | Données créées par run |
|---|---|---|
| A | **Jeu partagé** : un projet `seed` crée les données une fois (comme une base de recette préremplie), tous les tests les réutilisent | 0 (une seule fois, au premier run) |
| B | **Factory par test** : chaque test crée ses données par l'API, et les supprime à la fin | 1 jeu par test |
| C | **Factory par worker** : une fixture de portée `worker` crée les données une fois par worker | 1 jeu par worker |

La suite répète 8 cas qui écrivent puis relisent : une dépense, un revenu, la dernière transaction du compte, un renommage, une dépense catégorisée, une dépense taguée, la page du compte (dans le navigateur), un archivage. Elle est écrite avec soin pour le jeu partagé : **assertions relatives** (on lit le solde avant, on vérifie l'écart après) et **remise en état dans un `finally`**. Les tests ne dépendent pas les uns des autres.

Terrain : Firefly III en Docker (`compose.yml`), sur une instance à part de celle de l'expérience 02. La session est partagée par worker (la conclusion de l'expérience 02) ; les données passent par l'API REST de Firefly.

## Lancer

```bash
docker compose -f experiences/03-donnees-de-test/compose.yml up -d --wait
node experiences/03-donnees-de-test/measure.mjs 3
```

Résultats bruts : `resultats.json`.

## Résultats

### 1. Le parallélisme (40 tests, échecs par run, 5 runs)

| Workers | A · jeu partagé | B · factory par test | C · factory par worker |
|---|---|---|---|
| 1 | 0, 0, 0, 0, 0 | 0, 0, 0, 0, 0 | 0, 0, 0, 0, 0 |
| 2 | **7, 6, 6, 7, 6** | 0, 0, 0, 0, 0 | 0, 0, 0, 0, 0 |
| 4 | **10, 11, 10, 11, 10** | 0, 0, 0, 0, 0 | 0, 0, 0, 0, 0 |

Le jeu partagé tient tant que les tests passent l'un après l'autre. Dès le deuxième worker, deux tests écrivent sur le même compte en même temps : le solde lu « avant » n'est plus celui d'avant. Les assertions relatives et les `finally` n'y changent rien.

Les messages d'erreur ressemblent à des bugs de l'application, pas à une collision entre tests :

| Erreur (4 workers, 5 runs) | Occurrences | Tests concernés |
|---|---|---|
| `expect(received).toBeCloseTo(expected)` : un solde faux | 36 | une dépense, un revenu |
| `expect(received).toBe(expected)` : une autre « dernière transaction » | 16 | la dernière transaction |

### 2. La durée (4 workers, médiane de 3 runs)

| Tests | A · jeu partagé | B · factory par test | C · factory par worker |
|---|---|---|---|
| 8 | 4,2 s (3 échecs) | 3,7 s | **3,3 s** |
| 40 | 8,8 s (8 à 10 échecs) | 9,3 s | **6,7 s** |
| 200 | 42,7 s (50 à 56 échecs) | 44,7 s | **25,0 s** |

À 200 tests, créer et supprimer ses données dans chaque test coûte 79 % de plus que de les créer une fois par worker. Le jeu partagé n'est pas plus rapide pour autant : ses runs rouges ne se comparent pas (un test en échec s'arrête plus tôt, ou attend son timeout).

### 3. Ce qui reste en base

Inventaire des entités de l'expérience après un run de 40 tests, puis après un run de 200 tests interrompu au bout de 8 secondes : `SIGINT` comme une CI annulée, `SIGKILL` comme un runner tué.

| Après… | A · jeu partagé | B · factory par test | C · factory par worker |
|---|---|---|---|
| un run normal | 1 jeu, **25 transactions de plus** | rien | rien |
| une CI annulée (SIGINT) | 1 jeu, 22 transactions | 1 catégorie, 1 tag, 1 transaction | rien |
| un runner tué (SIGKILL) | 1 jeu, 22 transactions | 4 comptes, 2 catégories, 2 tags | 4 jeux, 37 transactions |

Le jeu partagé ne se nettoie jamais : chaque run de 40 tests ajoute 25 transactions au même compte. Les factories nettoient derrière elles, sauf quand le processus est tué : leurs restes portent alors un nom unique, et ne gênent pas les runs suivants. Il faut quand même les ramasser (ici, `commun/api.ts` supprime tout ce qui porte le préfixe `labo03`).

### 4. Un test échoue avant de remettre son compte en état (40 tests, 4 workers, 3 essais)

Un test renomme et archive le compte, puis échoue avant de le remettre en état, comme un test interrompu par un bug ou un timeout. Un run normal suit, sans nettoyage.

| Échecs | A · jeu partagé | B · factory par test | C · factory par worker |
|---|---|---|---|
| Run avec le test en échec | 12, 13, 12 | **1, 1, 1** | **1, 1, 1** |
| Run suivant | 10, 9, 10 | 0, 0, 0 | 0, 0, 0 |

Avec le jeu partagé, la pollution survit au run : au run suivant, « la page du compte affiche son nom » échoue aux 3 essais. Mais cet échec se noie parmi ceux du parallélisme : sur 9 ou 10 échecs, rien ne désigne le test fautif du run précédent. D'ailleurs, le test de renommage remet le nom d'origine dans son `finally` : selon l'ordre des tests, il répare la pollution par hasard.

Avec les factories, seul le test fautif échoue. Pour la factory par worker, ce n'est pas un hasard : après un échec, Playwright remplace le worker, et les fixtures de portée `worker` sont recréées avec des données neuves.

## Ce qu'on peut en dire

- **Un jeu de données partagé interdit le parallélisme**, même avec des tests bien écrits : les assertions relatives et les `finally` ne protègent pas de deux tests qui écrivent en même temps.
- **Ses échecs ressemblent à des bugs** (un solde faux, une transaction manquante) : on cherche dans l'application ce qui vient de la suite.
- **La factory par worker est la plus rapide et la plus isolée de celles mesurées ici** : 25 s au lieu de 45 s pour la factory par test à 200 tests, aucun échec, et un worker neuf après chaque échec. Sa limite : les tests d'un même worker partagent les données ; un test qui laisse une trace sans échouer la transmet aux suivants.
- **La factory par test est la seule à isoler chaque test**, pour 79 % de durée en plus à 200 tests. Elle se justifie pour les tests qui modifient en profondeur ce qu'ils reçoivent (suppression, changement d'état irréversible).
- **Toute stratégie qui crée des données a besoin d'un nettoyage de rattrapage** : un runner tué laisse des restes, même avec des fixtures bien écrites. Un préfixe commun suffit à les retrouver.

## Limites

- Firefly tourne sur un Mac (Colima), pas en CI : les durées absolues dépendent de la machine, les rapports entre stratégies sont plus fiables.
- Les cas sont simples et lisent peu de données. Une suite qui compte des listes entières (« le compte a 3 transactions ») échouerait plus souvent avec un jeu partagé que celle-ci, qui ne fait que des comparaisons avant / après.
- Les interruptions ont lieu au bout de 8 secondes, à un moment arbitraire du run : les quantités de restes varient avec ce moment, pas leur présence.
- La factory par worker n'a pas été mesurée avec un test qui pollue ses données sans échouer : dans ce cas, le worker n'est pas remplacé.
