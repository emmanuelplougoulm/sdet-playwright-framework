# Expérience 06 · Comparer des captures : quels défauts visuels rattrape-t-on, et à quel prix ?

> Les hypothèses ont été écrites avant la mesure, avec le protocole. Elles sont reprises telles quelles, avec ce que la mesure en dit, après les résultats.

**Question :** une suite de comparaison de captures rattrape-t-elle les défauts que voit l'utilisateur, sans échouer sur ce qui ne change rien pour lui ? Et combien coûte-t-elle quand l'interface change volontairement ?

Une capture de référence enregistre ce que l'interface affiche aujourd'hui, pas ce qu'elle doit garantir. La question est donc de savoir quels réglages la rapprochent d'un contrat visuel, et lesquels la réduisent à « l'écran ressemble à hier ».

## Le terrain

Le site de démo des expériences 04 et 05 (Practice Software Testing, sprint 5), lancé en local avec le `compose.yml` de la 04. Comme dans la 05, chaque changement est appliqué dans le code Angular (remplacement exact, puis nouveau build), et le code d'origine revient avant le changement suivant.

**Écrans capturés :** l'accueil (liste des produits et filtres), la fiche « Combination Pliers » et la page Contact.

**Tailles d'écran :** bureau (1280 × 800) et mobile (390 × 844).

**Où tournent les tests :** les références et tous les runs se font dans l'image Docker officielle de Playwright, à la même version que le labo (`mcr.microsoft.com/playwright:v1.64.1-noble`), pour avoir le même rendu à chaque run. La seule exception est le bruit « autre machine » (B2).

## Les stratégies

| | Stratégie | Ce qui est capturé | Règle d'échec |
|---|---|---|---|
| A | **Pleine page, stricte** | 3 écrans × 2 tailles = 6 captures `fullPage` | un seul pixel différent (`maxDiffPixels: 0`, seuil de couleur par défaut) |
| B | **Pleine page, tolérante** | les mêmes captures que A | plus de 0,1 %, 1 % ou 5 % des pixels différents |
| C | **Pleine page, masquée** | les mêmes captures, avec les prix et les images produit masqués | un seul pixel différent hors des masques |
| D | **Par composant** | l'en-tête, la colonne des filtres, la première carte produit, le bloc de la fiche et le formulaire Contact, aux deux tailles (les filtres sont repliés sur mobile, donc 9 captures en tout) | un seul pixel différent |

Les trois stratégies capturées (A, C, D) utilisent les réglages par défaut de `toHaveScreenshot` : animations coupées, curseur de saisie masqué, attente de deux captures identiques avant de comparer.

**Comment B est calculée :** B ne relance rien. A relève, pour chaque capture, la part de pixels différents (lue dans le message d'erreur de Playwright, 0 quand la capture passe). B applique ensuite trois seuils à ces mêmes chiffres. On obtient ainsi la courbe complète, défauts rattrapés et fausses alertes, selon la tolérance.

**Les masques de C sont choisis avant la mesure :** ce sont les zones qu'une équipe masque d'habitude parce qu'elles dépendent des données, à savoir les prix et les images produit. Ils ne sont pas ajustés après coup pour faire passer un changement.

## Les changements

Trois familles, comme dans la 05, avec une différence : ici, le bruit ne vient pas du code mais de l'environnement.

### Défauts visuels : un test qui casse rattrape un vrai défaut

| | Changement | Écran touché | Ce que voit l'utilisateur |
|---|---|---|---|
| D1 | Le nom du produit sur les cartes tient sur une ligne, coupé par des points de suspension | accueil | « Combination Pli… » |
| D2 | Le prix des cartes passe en gris très clair (`#c8c8c8`, contraste d'environ 1,7:1) | accueil | des prix presque illisibles |
| D3 | La pile de polices système de Bootstrap est remplacée par une police absente : le navigateur retombe sur une police à empattements, comme quand une police web ne se charge pas | toutes | toute la typographie change |
| D4 | La grille des produits exige des cartes de 420 px au lieu de 250 px | accueil | défilement horizontal sur mobile, 2 colonnes au lieu de 3 sur bureau |
| D5 | Une marge négative fait remonter le bouton « Add to cart » sur le champ quantité | fiche | le bouton chevauche le champ |
| D6 | Les espacements internes des cartes passent de 1rem à 0,75rem | accueil | un écart de maquette, à peine visible |
| D7 | Le contour de focus est supprimé partout (`outline: none`) | toutes | rien au repos ; au clavier, on ne sait plus où on est |

D6 teste la sensibilité des seuils : c'est un vrai écart par rapport à la maquette, mais il touche peu de pixels. D7 sert à mesurer une limite : une capture prise au repos ne peut pas voir un défaut qui n'apparaît qu'au focus. Toutes les stratégies devraient le manquer.

### Changements voulus : un test qui casse demande de la maintenance

| | Changement | Écrans touchés |
|---|---|---|
| V1 | L'en-tête passe en sombre (`navbar-light bg-light` → `navbar-dark bg-dark`) | toutes |
| V2 | « Add to cart » devient « Add to basket » | fiche |
| V3 | La bannière de l'accueil est remplacée par une autre image | accueil |

Ici, on ne compte pas une détection mais un coût : le nombre de références à régénérer, et à relire, pour remettre la suite au vert.

### Bruit : un test qui casse est une fausse alerte

Aucun de ces cas ne touche au code de l'interface.

| | Source de bruit | Comment elle est produite |
|---|---|---|
| B1 | Répétition | 10 runs sur l'interface d'origine |
| B2 | Autre machine | les mêmes tests lancés sur le Mac, hors Docker, contre les références faites sous Linux |
| B3 | Donnée modifiée | le prix de « Combination Pliers » passe de 14.15 à 15.15 dans la base : une donnée change, pas l'interface |
| B4 | API lente | chaque réponse de l'API est retardée de 1,5 s (`page.route`) : squelettes de chargement, images chargées tard |
| B5 | Souris restée sur une carte | le pointeur survole la première carte au moment de la capture (fond gris et zoom de l'image au survol) |

B3 est discutable, et c'est voulu : pour un test visuel, un prix qui change n'est pas un défaut, puisque c'est aux tests fonctionnels de vérifier les prix. C'est exactement le cas que les masques de C sont censés absorber.

## La mesure

Les règles sont celles de la 05 :

- Pour chaque changement, les trois stratégies capturées tournent **deux fois**. Une capture est **en échec** si elle échoue aux deux runs ; un échec à un seul des deux runs est compté à part, comme **isolé**.
- Un changement est **détecté** par une stratégie si au moins une capture est en échec.
- Après chaque changement, le code d'origine revient, et les trois suites doivent repasser au vert avant de continuer.

Ce qui est relevé, pour chaque changement et chaque stratégie :

1. Les captures en échec, sur le total.
2. La part de pixels différents de chaque capture (elle sert au calcul de B).
3. Pour les défauts : est-ce qu'une capture de l'écran touché échoue, ou seulement une capture d'un autre écran, par accident ?
4. Pour les changements voulus : le nombre de références à régénérer.
5. Le coût fixe de chaque stratégie : la durée d'un run (médiane de 3) et la taille des références sur le disque.

## Lancer

```bash
docker compose -f experiences/04-mocks-reseau/compose.yml up -d
docker compose -f experiences/04-mocks-reseau/compose.yml exec laravel-api php artisan migrate:fresh --seed --force
node experiences/06-captures-visuelles/measure.mjs
```

Le script refait les références dans l'image Docker de Playwright, puis enchaîne stabilité, durées, changements et bruit. Comme dans la 05, une mesure interrompue reprend après le dernier cas mesuré (`.mesure-partiel.json`). Si une capture échoue sur l'interface d'origine pendant la stabilité, la mesure s'arrête : rien ne se mesure sur une suite instable.

Résultats bruts : `resultats.json` (pour chaque cas et chaque capture : statut et part de pixels différents aux deux runs).

## Résultats (25/11/2026, Playwright 1.64.1)

### 1. Stabilité, durée, stockage

Sur l'interface d'origine, les 21 captures tournent 10 fois chacune dans l'image Docker : **0 échec sur 210 exécutions** (B1). Aucune capture n'a eu besoin d'un masque ou d'une attente supplémentaire pour être stable.

| | A · pleine page | C · masquée | D · composants |
|---|---|---|---|
| Captures | 6 | 6 | 9 |
| Durée d'un run (2 workers, médiane de 3) | 7,2 s | 6,8 s | 9,8 s |
| Références sur le disque | 3,9 Mo | 1,2 Mo | 1,1 Mo |

D est la plus lente parce qu'elle ouvre une page par capture (9 au lieu de 6). Les masques de C réduisent les références au tiers : les images produit sont remplacées par des aplats.

### 2. Ce que chaque cas fait échouer (captures en échec aux deux runs)

| Cas | A · strict | B · > 0,1 % | B · > 1 % | B · > 5 % | C · masquée | D · composants |
|---|---|---|---|---|---|---|
| **D1** nom tronqué | 2/6 | 2/6 | 2/6 | 1/6 | 2/6 | 3/9 |
| **D2** prix illisible | 2/6 | 0/6 | 0/6 | 0/6 | **0/6** | 2/9 |
| **D3** police de secours | 6/6 | 6/6 | 5/6 | 2/6 | 6/6 | 8/9 |
| **D4** grille qui déborde | 2/6 | 2/6 | 2/6 | 2/6 | 2/6 | 3/9 |
| **D5** bouton recouvert | 2/6 | 2/6 | 2/6 | 2/6 | 2/6 | 2/9 |
| **D6** écart d'espacement | 2/6 | 2/6 | 2/6 | 1/6 | 2/6 | 3/9 |
| **D7** focus invisible | **0/6** | 0/6 | 0/6 | 0/6 | 0/6 | **0/9** |
| **V1** en-tête sombre | 6/6 | 6/6 | 6/6 | 3/6 | 6/6 | 2/9 |
| **V2** « Add to basket » | 2/6 | 2/6 | 0/6 | 0/6 | 2/6 | 2/9 |
| **V3** nouvelle bannière | 2/6 | 2/6 | 2/6 | 1/6 | 2/6 | **0/9** |
| **B2** autre machine | 6/6 | 6/6 | 6/6 | 2/6 | 6/6 | 8/9 |
| **B3** donnée modifiée | 4/6 | 0/6 | 0/6 | 0/6 | 0/6 | 4/9 |
| **B4** API lente | 0/6 | 0/6 | 0/6 | 0/6 | 0/6 | 0/9 |
| **B5** souris sur une carte | 2/6 | 2/6 | 0/6 | 0/6 | 2/6 | 2/9 |

Aucune capture n'a échoué à un seul des deux runs : tous les échecs sont reproductibles.

### 3. Par famille

| | A · strict | B · > 0,1 % | B · > 1 % | B · > 5 % | C · masquée | D · composants |
|---|---|---|---|---|---|---|
| Défauts D1 à D6 rattrapés (sur 6) | **6** | 5 | 5 | 5 | 5 | **6** |
| D7, focus invisible (sur 1) | 0 | 0 | 0 | 0 | 0 | 0 |
| Fausses alertes sur le bruit B2 à B5 (sur 4) | 3 | 2 | 1 | 1 | 2 | 3 |
| … sans B2, la suite toujours lancée dans Docker (sur 3) | 2 | 1 | **0** | **0** | 1 | 2 |
| Références à régénérer pour V1 à V3 | 10 | 10 | 8 | 4 | 10 | **4** |

### 4. La part de pixels en jeu

Le seuil de B ne peut séparer défauts et bruit que si les défauts touchent plus de pixels que le bruit. Ce n'est pas le cas :

| Cas | Part de pixels différents, accueil bureau (A) |
|---|---|
| B3 · un prix change en base | 0,002 % |
| **D2 · prix illisible** | **0,036 %** |
| B5 · souris sur une carte | 0,80 % |
| D3 · police de secours | 1,2 % |
| B2 · autre machine | 2,0 % (jusqu'à 7,3 % sur la fiche) |
| D1 · nom tronqué | 3,5 % |
| D6 · écart d'espacement | 4,6 % |
| D4 · grille qui déborde | 24,9 % |

Le défaut d'accessibilité le plus net de la série, des prix presque illisibles, touche 20 fois moins de pixels qu'une souris restée sur une carte. Et un simple changement de machine touche plus de pixels qu'une police de secours.

### 5. Ce que les chiffres disent par stratégie

- **A, stricte, rattrape les 6 défauts de mise en page et de typographie, et 3 des 4 sources de bruit.** Elle ne fait pas la différence entre un prix illisible (0,036 %) et un prix qui change (0,002 %) : un pixel suffit dans les deux cas.
- **B, avec un seuil, échange les défauts fins contre le calme.** Dès 0,1 %, elle perd le prix illisible ; à 1 %, elle ignore la donnée et la souris, et ne garde comme fausse alerte que le changement de machine. Aucun seuil ne garde D2 en ignorant B5.
- **C, masquée, fait exactement ce qu'on lui demande.** Elle ignore la donnée modifiée (B3), et pour la même raison ne voit pas le prix illisible (D2) : le défaut est dans la zone masquée.
- **D, par composant, coûte moins cher en maintenance** (4 références à régénérer au lieu de 10 pour les trois changements voulus) **et rattrape les 6 défauts.** Mais elle ne voit que ce qu'elle capture : la bannière (V3) peut changer, ou casser, sans qu'aucune capture ne bouge. Et un composant n'est pas isolé de la page (voir plus bas).
- **Le focus supprimé (D7) passe partout.** Une capture prise au repos ne contient aucun focus.

### 6. Deux surprises

**La colonne des filtres échoue sur des défauts des cartes.** Dans D, la capture des filtres échoue sur D1, D4 et D6, trois défauts qui ne touchent que les cartes produit. La colonne des filtres est dans la même rangée Bootstrap que la grille des produits, et la rangée étire ses colonnes à la même hauteur : quand les cartes changent de hauteur, la capture des filtres change de taille. Ces trois détections sont accidentelles : une capture de composant capture aussi sa boîte, et la boîte dépend de ses voisins.

**La souris n'est pas absorbée.** Playwright coupe les animations avant de capturer, mais une transition coupée saute à son état final : la carte survolée est capturée avec son fond gris et son image zoomée. Ici, le survol était provoqué exprès ; dans une vraie suite, c'est ce qui arrive quand un test survole ou clique un élément juste avant de capturer.

## Hypothèses, écrites avant la mesure

1. **A rattrape les défauts D1 à D6 mais échoue aussi sur B2, B3 et B5.** La stricte égalité au pixel ne fait pas la différence entre un défaut et du bruit.
2. **B ne trouve pas de seuil qui sépare proprement les deux familles.** D6 touche moins de pixels que B2 : un seuil qui ignore l'autre machine laissera passer l'écart de maquette.
3. **C absorbe B3, mais devient aveugle à D2.** Le prix illisible est justement dans une zone masquée.
4. **D coûte moins cher en maintenance**, surtout pour V1 (une seule capture d'en-tête à régénérer par taille, au lieu de toutes les pages), **mais manque ce qui sort des composants capturés**, comme le débordement de D4 sur mobile.
5. **Aucune stratégie ne voit D7.** Pour la voir, il faut une capture prise après une action au clavier, et aucune des stratégies n'en prend.
6. **B4 et B5 sont absorbés par l'attente de stabilité et la coupure des animations de Playwright.** Ce sera à vérifier : le zoom de l'image dure 5 s au survol.

### Ce que la mesure en dit

1. **Confirmée.** A rattrape D1 à D6, et échoue aussi sur B2, B3 et B5.
2. **Confirmée, mais pas pour la raison prévue.** L'écart de maquette (D6, 4,6 %) dépasse le changement de machine sur l'accueil (2,0 %). Le cas qui rend tout seuil impossible est le prix illisible : 0,036 %, sous la souris (0,8 %) et sous tous les seuils testés.
3. **Confirmée.** C ignore B3 et ne voit pas D2.
4. **À moitié.** D coûte bien moins cher pour V1 (2 références au lieu de 6). Mais elle n'a pas manqué le débordement mobile (D4) : la carte produit capturée change de largeur. Son vrai angle mort est ce qui n'appartient à aucun composant capturé, comme la bannière (V3).
5. **Confirmée.** Aucune stratégie ne voit D7.
6. **À moitié.** L'API lente (B4) est absorbée : la suite attend le contenu, puis deux captures identiques. La souris (B5) ne l'est pas : couper les animations fige l'état de survol au lieu de l'effacer.

## Ce qu'on peut en dire

- **Le premier réglage d'une suite visuelle, c'est la machine.** Le même code rendu sur le Mac et sous Linux échoue sur 20 captures sur 21, avec des écarts plus grands que la plupart des défauts injectés. Dans l'image Docker, la même suite a tenu 210 exécutions sans un échec.
- **La part de pixels ne mesure pas la gravité.** Le défaut qui gêne le plus un utilisateur (des prix illisibles) est le plus petit en pixels. Un seuil global, choisi pour calmer la suite, le fait disparaître en premier.
- **Masquer, c'est renoncer à vérifier la zone.** Un masque sur les prix doit être compensé par un autre test de cette zone : une assertion sur le texte du prix, un contrôle de contraste.
- **Capturer par composant est moins cher, mais ne voit que les composants choisis**, et ne les isole pas de la mise en page qui les entoure.
- **Une capture au repos ne voit ni le focus, ni le survol voulu.** Les états d'interaction ne sont vérifiés que si la suite les produit et les capture exprès. Le survol, lui, fausse les captures quand il n'est pas voulu : remettre le pointeur hors de la page avant de capturer.
- **Ce qu'en tirer pour une suite** : une image de rendu fixe, des captures strictes par composant pour les zones critiques, une pleine page tolérante par écran pour attraper ce qui n'appartient à aucun composant, des masques limités aux données vraiment dynamiques et compensés par une assertion, et des captures explicites des états de focus.

## À vérifier avant de lancer

- [x] Le conteneur Playwright, lancé avec `--network host`, atteint bien l'interface (4200) et l'API (8091) à travers Colima.
- [x] Chaque remplacement de D1 à D7 et de V1 à V3 trouve son texte d'origine dans l'image publiée (`MESURE_VERIFIER=1`).
- [x] Les références d'origine sont stables : 0 échec sur 210 exécutions (B1).
- [x] Les masques de C couvrent bien tous les prix et toutes les images produit (vérifié sur les références).

## Limites

- Une seule application, 3 écrans, 2 tailles. Les proportions dépendent des écrans choisis.
- Les défauts sont choisis à la main, comme dans la 05. Leur taille (beaucoup ou peu de pixels touchés) décide directement du bilan de B.
- B est calculée à partir des runs de A, sans être relancée : c'est le même rendu, mais ce n'est pas exactement un run fait avec ce seuil.
- Un seul navigateur, Chromium. Le rendu de Firefox et de WebKit pourrait faire l'objet d'une autre expérience.
- L'image de l'interface est en `amd64`, émulée sur un Mac `arm64` : les durées absolues sont indicatives, comme dans la 05.
- La taille d'écran mobile est émulée par Chromium (390 × 844, densité 1), pas rendue sur un vrai téléphone.
- Quand une capture change de taille, Playwright ne compte pas toujours les pixels différents : la part est alors comptée comme 100 %. Cela ne change aucun bilan, puisque ces captures échouent à tous les seuils, mais certaines parts du tableau 4 ne sont pas mesurables pour ces cas-là.
- La première mesure s'est arrêtée au cas B3 : l'API garde les produits en cache 120 s, et le prix modifié en base ne sortait pas. Le script vérifiait justement ce point avant de mesurer. Il vide maintenant le cache de l'API après chaque écriture en base ; la mesure a repris au cas B3, après avoir remis le code d'origine.

## Et ensuite : l'expérience 07

Sur les mêmes défauts D1 à D7, l'expérience 07 remplacera les captures par des invariants vérifiés sans pixel : aucun chevauchement, aucun texte coupé, aucun défilement horizontal, contraste calculé, focus visible. La question sera de savoir ce qu'un contrat visuel écrit rattrape par rapport à une capture.
