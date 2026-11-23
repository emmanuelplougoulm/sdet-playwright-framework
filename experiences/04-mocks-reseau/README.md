# Expérience 04 · Mocker le réseau, ou tester contre le vrai backend ?

**Question :** une suite d'interface qui mocke l'API est plus rapide. Quels bugs laisse-t-elle passer, et que rattrapent des tests de contrat ?

## Les stratégies

La même suite de 6 tests d'interface (accueil, recherche, filtre par catégorie, pagination, fiche produit, panier) sur le site de démo du labo, lancé en local (`compose.yml`, images Docker publiées par testsmith). Seule la façon de servir l'API change.

| | Stratégie | Ce que la suite voit |
|---|---|---|
| A | **Backend réel** | la vraie API |
| B | **Mocks écrits à la main** : `page.route` sert des fixtures JSON, copiées une fois depuis la vraie API, choisies d'après le chemin et quelques critères du corps | les fixtures |
| C | **HAR rejoué** : `routeFromHAR` rejoue le trafic enregistré sur l'application saine | l'enregistrement |
| D | **Tests de contrat** : 7 tests d'API vérifient que la vraie API répond encore avec la forme des fixtures de B (mêmes clés, mêmes types) | la vraie API, sans navigateur |

B et D vont ensemble : D garde honnêtes les mocks de B. Fixtures et HAR sont enregistrés par un même test (`commun/enregistrer.spec.ts`), sur l'application sans bug.

## Lancer

```bash
docker compose -f experiences/04-mocks-reseau/compose.yml up -d
docker compose -f experiences/04-mocks-reseau/compose.yml exec laravel-api php artisan migrate:fresh --seed --force
node experiences/04-mocks-reseau/measure.mjs 5
```

Résultats bruts : `resultats.json`.

## Le protocole de détection

Dix bugs, injectés un par un dans le code de l'application (remplacement exact d'une ligne, puis redémarrage de l'API ou nouveau build de l'interface) : sept dans l'API, trois dans l'interface. Puis un changement de données qui n'est pas un bug. Pour chacun, les quatre suites tournent deux fois. Un bug est **détecté** par une suite si un de ses tests, vert sur l'application saine, passe au rouge ; les deux runs ont toujours donné le même résultat. Après chaque bug, le code d'origine revient, et la suite réelle doit repasser au vert avant de continuer.

## Résultats

### 1. Quels bugs chaque suite détecte

| Bug injecté | Côté | A · réel | B · mocks | C · HAR | D · contrat |
|---|---|---|---|---|---|
| Le prix est renvoyé en texte (`"14.15"`) au lieu d'un nombre | API | ✅ 4 tests | ❌ | ❌ | ✅ |
| La liste des produits ne renvoie plus le nom | API | ✅ 6 tests | ❌ | ❌ | ✅ |
| La recherche ignore le mot-clé | API | ✅ | ❌ | ❌ | ❌ |
| La liste passe à 3 produits par page | API | ✅ | ❌ | ❌ | ❌ |
| La fiche produit répond par une erreur 500 | API | ✅ 2 tests | ❌ | ❌ | ✅ |
| Tous les produits sont en rupture de stock | API | ✅ | ❌ | ❌ | ❌ |
| Le filtre par catégorie est ignoré | API | ✅ | ❌ | ❌ | ❌ |
| L'interface envoie la recherche sous un autre nom de paramètre | interface | ✅ | ❌ | ❌ | ❌ |
| Les cartes affichent le prix sans les centimes | interface | ✅ | ✅ | ✅ | ❌ |
| L'interface envoie le nom du produit au panier au lieu de son identifiant | interface | ✅ | ❌ | ✅ | ❌ |
| **Bugs détectés** | | **10 / 10** | **1 / 10** | **2 / 10** | **3 / 10** |

Mocks écrits à la main et tests de contrat ensemble : **4 / 10**.

- **Une suite mockée ne voit que l'interface.** Sur les 7 bugs de l'API, elle n'en voit aucun : elle ne lui parle pas. Elle manque aussi 2 des 3 bugs d'interface, ceux qui touchent à ce que l'interface *envoie* : le mock répond la même chose quel que soit le paramètre de recherche ou l'identifiant reçu.
- **Le HAR rattrape le panier, pas la recherche.** Il compare le corps des requêtes `POST` à l'enregistrement : un mauvais identifiant envoyé au panier ne trouve pas de réponse, et le test échoue. La recherche, elle, passe par une requête `QUERY` dont le corps n'est pas comparé (voir plus bas).
- **Les tests de contrat rattrapent les bugs de forme** (un type changé, un champ disparu, une erreur 500), pas les bugs de comportement : une recherche qui renvoie tout, une pagination à 3 ou un stock faux gardent exactement la même forme.
- **Un même bug de forme casse plusieurs tests réels** : le prix en texte fait planter l'affichage des cartes (`price.toFixed` sur une chaîne), et 4 tests sur 6 échouent.

### 2. Un changement de données qui n'est pas un bug

Le premier produit du catalogue passe en rupture de stock, comme en production. La suite réelle échoue (« un produit en stock s'ajoute au panier » prend le premier produit de la liste) ; les suites mockées restent vertes. C'est l'autre face de la suite réelle : elle dépend des données du backend, et un test qui ne choisit pas ses données (voir l'expérience 03) échoue sans qu'il y ait de bug.

### 3. La durée (2 workers, médiane de 5 runs)

| A · réel | B · mocks | C · HAR | D · contrat |
|---|---|---|---|
| 5,1 s | **2,0 s** | 7,4 s (2 tests en échec) | **0,9 s** (7 tests, sans navigateur) |

Les mocks divisent la durée de la suite par 2,5. Le HAR est plus lent que le backend réel, mais ses runs ne se comparent pas : deux de ses tests attendent leur délai avant d'échouer.

### 4. Le HAR rejoué casse sur l'application saine

Sur l'application sans bug, le HAR fait échouer 2 tests sur 6 (« la page 2 affiche d'autres produits » et « le filtre par catégorie ne garde que les marteaux »), à chaque run. Ce site envoie ses critères de liste (page, catégorie) dans le corps de requêtes `QUERY` à la même URL. Or Playwright retrouve une réponse du HAR d'après la méthode et l'URL, et ne compare le corps que pour `POST` (playwright-core 1.64, `_harFindResponse`) : la page 2 et le filtre reçoivent la réponse de la page 1. Les mêmes limites valent pour `PUT` et `PATCH`.

## Ce qu'on peut en dire

- **Une suite mockée est une suite de l'interface seule** : rapide (2,5 fois plus ici) et indépendante des données, mais aveugle à tout ce qui se passe derrière le mock, et à ce que l'interface envoie quand le mock ne le vérifie pas.
- **Les tests de contrat sur la forme gardent les mocks honnêtes, pas l'application correcte** : ils voient qu'un champ change de type ou disparaît, pas qu'une recherche renvoie les mauvais produits.
- **Mocks et contrat ensemble ne remplacent pas le backend réel** : 4 bugs sur 10, contre 10 sur 10. Les 6 bugs manqués sont des bugs de comportement, ceux qu'un utilisateur voit.
- **Un HAR rejoué est plus strict qu'un mock écrit à la main, mais pas partout** : il vérifie le corps des `POST`, pas celui des autres méthodes. Avant de s'y fier, il faut savoir quelles méthodes l'application utilise.
- **Ce qu'en tirer pour une stratégie de test** : des mocks pour ce que le backend réel rend difficile (erreurs, listes vides, cas limites), des tests de contrat pour que ces mocks ne mentent pas, et une couche de tests contre le vrai backend pour les parcours critiques, avec des données qu'ils créent eux-mêmes.

## Limites

- Les dix bugs sont choisis à la main, comme des régressions plausibles, pas tirés au hasard : la proportion de bugs de comportement et de bugs de forme influence directement le score des tests de contrat.
- Une seule application et une suite de 6 tests ; une vraie suite mockée vérifierait aussi des cas que le backend réel rend difficiles (erreurs, délais), que cette expérience ne mesure pas.
- Les tests de contrat ne vérifient que la forme des réponses. Des tests de contrat pilotés par le consommateur (à la Pact), avec des exemples de requêtes et de réponses attendues, rattraperaient sans doute une partie des bugs de comportement ; ils ne sont pas mesurés ici.
- L'interface est un build Angular servi en statique, dans une image `amd64` émulée sur un Mac `arm64` : les durées absolues sont indicatives.
