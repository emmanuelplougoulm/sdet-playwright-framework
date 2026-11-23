# Expérience 02 · Se connecter dans chaque test, ou partager une session ?

**Question :** quelle stratégie de connexion tient quand la suite grandit, tourne en parallèle et vit plus longtemps qu'une session ?

## Les quatre stratégies

Même suite de tests en lecture seule, mêmes fichiers de spec ; seule la fixture de connexion change.

| | Stratégie | Connexions par run |
|---|---|---|
| A | **Par l'interface, dans chaque test** : la fixture remplit l'écran de connexion | 1 par test |
| B | **Par requête, dans chaque test** : la fixture se connecte sans navigateur (API ou formulaire HTTP) et pose la session dans la page | 1 par test |
| C | **Session globale** : un projet `setup` se connecte une fois, tous les tests réutilisent son `storageState` | 1 |
| D | **Session par worker** : une fixture de portée `worker` se connecte une fois par worker | 1 par worker |

## Deux terrains

- **Firefly III en Docker** (`firefly/`) : une vraie application à sessions serveur (Laravel), en local, sans limite de charge. C'est là que se font les mesures à l'échelle : 8, 40 et 200 tests, 4 workers, 3 runs.
- **Le site de démo Practice Software Testing** (`strategies/`) : une application à jeton JWT de 5 minutes. Service public, 3 workers. Pendant un premier passage, le compte de démo partagé a été refusé (HTTP 401) puis verrouillé (HTTP 423) pendant une cinquantaine de minutes, pour une cause inconnue : toutes les stratégies sont tombées, y compris celles qui ne se connectent qu'une fois. Le script vérifie maintenant le compte avant chaque run et refait un run touché par un verrou. Ce terrain permet de mesurer l'expiration du jeton, que Firefly ne permet pas (durée de session fixée à 120 min dans son code).

## Lancer

```bash
docker compose -f experiences/02-storage-state/firefly/compose.yml up -d --wait
node experiences/02-storage-state/firefly/measure.mjs 3
node experiences/02-storage-state/measure.mjs 3   # site de démo : à lancer avec parcimonie
```

Résultats bruts : `firefly/resultats.json` et `resultats.json`.

## Résultats

### 1. La durée (Firefly, 4 workers, médiane de 3 runs)

| Tests | A · interface | B · requête | C · session globale | D · session par worker |
|---|---|---|---|---|
| 8 | 5,9 s | 5,3 s | 5,5 s | 4,8 s |
| 40 | 12,9 s | 10,0 s | 9,4 s | 7,8 s |
| 200 | **62,1 s** | 42,1 s | 36,9 s | **30,9 s** |
| Connexions (200 tests) | 200 | 200 | 1 | 4 |

À 8 tests, les écarts se perdent dans le bruit. À 200, se connecter par l'interface double la durée de la suite. La session par worker est la plus rapide, devant la session globale.

### 1 bis. La durée sur le site de démo (3 workers, médiane de 3 runs)

| Tests | A · interface | B · API | C · session globale | D · session par worker |
|---|---|---|---|---|
| 8 | 5,2 s | 4,4 s | 4,6 s | 4,6 s |
| 24 | 8,8 s | 5,9 s | 6,4 s | 4,9 s |
| 48 | **16,4 s** | 13,4 s | 13,4 s | **10,6 s** |
| Connexions (48 tests) | 48 | 48 | 1 | 3 |

Même tendance que sur Firefly : à 48 tests, l'interface coûte 55 % de plus que la session par worker.

### 2. L'écran de connexion casse (8 tests, timeout par défaut de 30 s)

| | A | B | C | D |
|---|---|---|---|---|
| Firefly | 8 échecs, 62 s | **vert**, 4,6 s | setup en échec, 8 non exécutés, 31 s | **vert**, 4,7 s |
| Site de démo | 8 échecs, 92 s | **vert**, 4,2 s | setup en échec, 8 non exécutés, 31 s | **vert**, 4,4 s |

Les stratégies B et D ne passent pas par l'écran de connexion : une régression de cet écran ne casse que ses propres tests, au lieu de toute la suite. Avec A, chaque test attend son timeout avant d'échouer : le run rouge est le plus long des quatre.

### 2 bis. L'écran de connexion change : ce que relance `--only-changed`

Un sélecteur de l'écran de connexion est modifié, et `--only-changed` choisit les tests à relancer.

| | A | B | C | D |
|---|---|---|---|---|
| Firefly et site de démo | les 8 tests | **aucun** | le setup seul | **aucun** |

Avec A, toute modification de l'écran de connexion relance toute la suite. Avec C, seul le setup la vérifie. Avec B et D, aucun test ne passe par cet écran : il lui faut ses propres tests, sinon une régression de la connexion passe inaperçue.

Au passage : `--only-changed` choisit les tests d'après le fichier qui appelle `test()`. Dans une première version, les tests étaient déclarés dans une fonction commune (`commun/suite.ts`) : `--only-changed` n'en relançait aucun, même quand le fichier de spec lui-même changeait. Une suite générée par une fonction partagée perd donc cette sélection.

### 3. Un test se déconnecte au début de la suite (Firefly, 40 tests, 5 runs)

| Échecs par run | A | B | C · session globale | D |
|---|---|---|---|---|
| 1 worker | 0 | 0 | **40, 40, 40, 40, 40** | 1, 1, 1, 1, 1 |
| 4 workers | 0 | 0 | **1, 37, 37, 37, 36** | 1, 1, 1, 1, 1 |

Avec une session globale, une déconnexion invalide la session de toute la suite. Avec 4 workers, le résultat change d'un run à l'autre (de 1 à 37 échecs) : c'est l'instabilité la plus coûteuse, celle qui ne se reproduit pas.

Sur le site de démo, seul un appel d'API révoque le jeton (la déconnexion de l'interface se contente de l'effacer du navigateur). Un test d'API révoque donc le jeton au début d'une suite de 24 tests (3 runs) :

| Échecs par run | A | B | C · session globale | D |
|---|---|---|---|---|
| 3 workers | 0, 0, 0 | 0, 0, 0 | **3, 3, 3** | 1, 1, 1 |

Les échecs ne visent que les tests qui lisent des données de l'API (l'e-mail du profil) : les pages elles-mêmes s'affichent, car l'application ne vérifie le jeton que localement. Le message d'erreur est une valeur attendue dans un champ, pas une erreur de connexion : rien ne pointe vers la session révoquée.

### 4. La session a plus de 5 minutes (site de démo, 24 tests, 2 essais)

| | C · session globale | D · session par worker |
|---|---|---|
| Tests passés | **1 / 24** | **3 / 24** |
| Rafraîchissements du jeton | 24 | 24 |

Le jeton du site vit 5 minutes. Expiré, l'application le rafraîchit, et l'API révoque l'ancien (liste noire). Le premier test qui rafraîchit garde la session ; tous les autres, qui partagent le même jeton expiré, se font refuser. Avec une session par worker, un seul test par worker s'en sort. Une suite qui dure plus longtemps que la session, ou un setup lancé longtemps avant les tests (sharding, étapes de CI séquentielles), suffit à tout faire tomber.

## Ce que ça coûte en CI : une projection

Les durées de Firefly à 40 et 200 tests donnent un coût marginal par test (4 workers) : 0,31 s pour A, 0,20 s pour B, 0,17 s pour C et 0,14 s pour D. En prolongeant ces droites (c'est une extrapolation, pas une mesure) :

| Hypothèses : 1 000 tests, 4 workers, 30 runs par jour, 220 jours par an | A · interface | B · requête | C · session globale | D · session par worker |
|---|---|---|---|---|
| Durée d'un run | 5 min 08 | 3 min 23 | 2 min 54 | **2 min 26** |
| Écart avec D, par run | +2 min 42 | +56 s | +28 s | – |
| Écart avec D, par an | **+296 h** | +103 h | +51 h | – |

Passer de A à n'importe quelle autre stratégie est le gain évident. Entre B, C et D, l'écart se compte en dizaines d'heures de machine par an, et en secondes d'attente par run. Ce gain se compare au coût d'un run rouge sans cause apparente (relance, diagnostic, confiance perdue dans la suite), que les sessions partagées produisent dans les scénarios 3 et 4. À chacun de remplacer les hypothèses par les siennes : nombre de tests, runs par jour, prix de la minute de CI.

## Ce qu'on peut en dire

- **Se connecter par l'interface dans chaque test coûte cher à l'échelle** (×2 sur 200 tests) et rend toute la suite dépendante de l'écran de connexion.
- **Partager une session est plus rapide, mais crée un état partagé.** Tout ce qui touche à la session (déconnexion, rafraîchissement, expiration, révocation) se propage aux autres tests, parfois de façon aléatoire.
- **La session par worker est le meilleur compromis mesuré ici** : la plus rapide, indépendante de l'écran de connexion, et elle limite les dégâts à un worker. Elle reste exposée à l'expiration si un worker vit plus longtemps que la session.
- **Se connecter par requête dans chaque test est la seule stratégie insensible aux incidents de session**, pour un surcoût de 15 à 35 % par rapport aux sessions partagées.
- **Quelle que soit la stratégie, l'écran de connexion mérite ses propres tests** : avec B et D, plus aucun test ne le traverse.
- **Un compte de test partagé est lui aussi un état partagé** : quand le compte public du site de démo a été verrouillé, les quatre stratégies sont tombées ensemble.
- **Le bon choix dépend de la durée de vie de la session de l'application.** Avant de choisir, il faut connaître trois choses : combien de temps vit une session, ce qui l'invalide, et si le rafraîchissement révoque l'ancienne.

## Limites

- Firefly tourne sur un Mac (Colima), pas en CI : les durées absolues dépendent de la machine, les rapports entre stratégies sont plus fiables.
- La projection CI prolonge des droites mesurées entre 40 et 200 tests ; à 1 000 tests, la base de données, le réseau ou le nombre de workers peuvent changer la pente.
- Le site de démo est un service public partagé : ses durées varient avec sa charge, et son compte de test peut être verrouillé par d'autres visiteurs.
- Avec la session par worker, la déconnexion fait échouer exactement 1 test à chaque run, alors que les tests du même worker partagent la session : la cause n'est pas encore établie.
- Les mesures Firefly et celles du site de démo ont pu tourner en même temps sur le même Mac : les durées absolues sont indicatives.
