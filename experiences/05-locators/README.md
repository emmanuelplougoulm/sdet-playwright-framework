# Expérience 05 · CSS, texte, rôle ou data-test : quels locators résistent aux changements ?

**Question :** quand l'interface change, quels locators cassent pour rien, et lesquels cassent quand l'utilisateur est touché ?

## Les stratégies

La même suite de 5 tests d'interface (recherche, filtre par catégorie, fiche produit, panier, menu) sur le site de démo de l'expérience 04, lancé en local. Les tests sont écrits une fois (`commun/suite.ts`) ; seul le jeu de locators change (`strategies/*/ecrans.ts`).

| | Stratégie | Ce que le locator vise | Replis |
|---|---|---|---|
| A | **CSS** | classes et structure du HTML, comme on les copie depuis les outils du navigateur (`button.btn-success`, `.card-body h5.card-title`) | aucun |
| B | **Texte** | le texte visible et le placeholder (`getByText`, `getByPlaceholder`) ; « Search », « Hammer » et « Contact » apparaissent plusieurs fois, trois locators choisissent donc l'élément par sa position (`.first()`, `.last()`, `.nth(1)`) | 1 : le lien du panier n'a pas de texte |
| C | **Rôle** | le rôle et le nom accessible, comme les voit un lecteur d'écran (`getByRole`, `getByLabel`) | aucun |
| D | **data-test** | les attributs posés pour les tests (`getByTestId`) | 1 : le titre de la page Contact n'a pas d'attribut |

Un **repli** est un élément qui n'offre aucune prise au type de locator choisi : la stratégie en emprunte alors un autre.

## Lancer

```bash
docker compose -f experiences/04-mocks-reseau/compose.yml up -d
docker compose -f experiences/04-mocks-reseau/compose.yml exec laravel-api php artisan migrate:fresh --seed --force
node experiences/05-locators/measure.mjs 3
```

Le script reconstruit l'interface Angular à chaque changement. L'image est en `amd64` : sur un Mac `arm64`, elle est émulée, et le build a besoin de plus de 2 Go dans la VM Docker (ici Colima, passé à 4 Go avec `colima start --memory 4`). Une mesure interrompue reprend après le dernier changement mesuré (`.mesure-partiel.json`), et remet d'abord le code d'origine, lu dans l'image publiée.

Résultats bruts : `resultats.json`.

## Le protocole

Dix changements de l'interface, appliqués un par un dans le code Angular (remplacement exact, puis nouveau build), en trois familles :

- **Refactors invisibles** : l'utilisateur ne voit aucune différence. Un test qui casse ici est une fausse alerte.
- **Changements visibles voulus** : un libellé, une couleur, un style changent, sans rien casser pour l'utilisateur. Un test qui casse ici demande de la maintenance.
- **Régressions d'accessibilité** : la page a l'air identique, mais un utilisateur au clavier ou avec un lecteur d'écran est gêné. Un test qui casse ici rattrape un vrai défaut.

Pour chaque changement, les quatre suites tournent deux fois. Un test est **cassé** s'il échoue aux deux runs ; un échec à un seul des deux runs est compté à part, comme **isolé**. Après chaque changement, le code d'origine revient, et les quatre suites doivent repasser au vert avant de continuer.

## Résultats (24/11/2026, Playwright 1.64.1)

### 1. Ce que chaque changement casse (tests cassés sur 5)

| Changement | Famille | A · CSS | B · texte | C · rôle | D · data-test |
|---|---|---|---|---|---|
| Le nom du produit sur les cartes passe de `<h5>` à `<h3>`, même style | refactor | **3** | 0 | 0 | 0 |
| Deux attributs `data-test` sont renommés (`product-name`, `add-to-cart`) | refactor | 0 | 0 | 0 | **4** |
| Le bouton de recherche change de couleur (`btn-secondary` → `btn-primary`) | visible | **1** | 0 | 0 | 0 |
| Les cases à cocher passent au style Bootstrap (`icheck` → `form-check-input`) | visible | **1** | 0 | 0 | 0 |
| « Add to cart » devient « Add to basket » | visible | 0 | **1** | **1** | 0 |
| Le bouton de recherche affiche une loupe au lieu de « Search » (`aria-label` conservé) | visible | 0 | **1** | 0 | 0 |
| Le lien « Contact » du menu devient « Contact us » | visible | 0 | **1** | 0 | 0 |
| Le bouton « Add to cart » devient une `<div>` cliquable : plus de rôle bouton, plus de clavier | accessibilité | **1** | 0 | **1** | 0 |
| Le champ de recherche perd son `<label>` (le placeholder reste) | accessibilité | 0 | 0 | 0 | 0 |
| Le nom des catégories sort du `<label>` : les cases n'ont plus de nom accessible | accessibilité | 0 | **1** | **1** | 0 |

### 2. Par famille (changements qui cassent au moins un test)

| | A · CSS | B · texte | C · rôle | D · data-test |
|---|---|---|---|---|
| Refactors invisibles (2) : fausses alertes | 1 | 0 | 0 | 1 |
| Changements visibles voulus (5) : maintenance | 2 | 3 | 1 | 0 |
| Régressions d'accessibilité (3) : défauts rattrapés | 1 | 1 | 2 | 0 |

- **Le CSS casse sur ce qui ne change rien à ce que l'utilisateur peut faire** : un titre qui change de balise (3 tests sur 5), une couleur, un style de case. Il rattrape le bouton devenu `<div>`, mais par hasard : le sélecteur vise la balise `button`, pas le rôle.
- **Le data-test ne casse que sur son propre renommage** : 4 tests sur 5 pour un nettoyage d'attributs, et 0 sur les 8 autres changements. Il ignore tout ce qui change pour l'utilisateur, y compris les trois régressions d'accessibilité.
- **Le texte casse sur les libellés** : 3 des 5 changements visibles. Il rattrape les cases sans nom, mais par hasard lui aussi : le texte n'étant plus dans le `<label>`, Playwright trouve un élément qui n'est pas une case (`Not a checkbox or radio button`).
- **Le rôle ne casse sur aucun refactor**, sur un seul changement visible (le libellé du bouton), et rattrape 2 des 3 régressions d'accessibilité, parce que c'est exactement ce qu'il vérifie : le bouton n'a plus de rôle `button`, les cases n'ont plus de nom.

### 3. Ce qu'aucune stratégie n'a vu

Le champ de recherche sans `<label>` passe partout. Le locator de rôle demande un champ nommé « Search » : sans label, Playwright calcule le nom accessible à partir du placeholder, qui dit encore « Search ». Le locator vérifie qu'un nom existe, pas d'où il vient.

De la même façon, `getByRole('link', { name: 'Contact' })` accepte « Contact us » : sans `exact: true`, le nom est comparé par sous-chaîne. C'est ce qui épargne au rôle ce changement-là ; le texte, écrit avec `exact: true`, casse.

### 4. La stabilité

Sur l'interface d'origine, chaque suite tourne 10 fois (50 exécutions par stratégie) :

| | A · CSS | B · texte | C · rôle | D · data-test |
|---|---|---|---|---|
| Échecs sur 50 exécutions | 0 | 0 | 0 | 0 |
| Échecs isolés pendant les changements (sur 100 exécutions) | 2 | **4** | 0 | 0 |

Les 4 échecs isolés du texte touchent le même test, « le filtre par catégorie ne garde que les marteaux ». Les erreurs relevées (le reporter garde celles du premier run) sont toutes `Not a checkbox or radio button` : son locator prend le premier élément dont le texte est exactement « Hammer » (`.first()`), et ce premier élément n'est pas toujours la case. Une première mesure, interrompue avant les changements, avait déjà relevé 2 échecs sur 50 pour ce test, et aucun pour les trois autres stratégies. Les 2 échecs isolés du CSS sont tombés au même run, le second des deux runs du changement « Add to basket » (le premier était vert), sur deux tests différents.

### 5. La durée (2 workers, médiane de 3 runs)

| A · CSS | B · texte | C · rôle | D · data-test |
|---|---|---|---|
| 4,7 s | 4,2 s | 4,9 s | 4,6 s |

Les runs se chevauchent (de 4,0 à 5,5 s selon le run) : le type de locator ne change pas la durée de la suite de manière mesurable ici.

## Ce qu'on peut en dire

- **Aucune stratégie ne casse « pour rien » et « pour de vrai » à la fois** : chacune casse sur une famille de changements différente. Le choix d'un locator, c'est le choix des changements qui feront échouer la suite.
- **Le CSS couple les tests à l'implémentation** : sur ces 10 changements, 3 de ses 4 échecs tombent sur un refactor et des retouches de style, qui ne changent rien à ce que l'utilisateur peut faire.
- **Le data-test est stable parce qu'il est aveugle** : il ne casse que si quelqu'un touche aux attributs de test, et ne voit aucune des régressions d'accessibilité.
- **Le rôle encode un contrat utilisateur** : zéro fausse alerte sur les refactors, et 2 régressions d'accessibilité sur 3 rattrapées, sans écrire un seul test d'accessibilité. Ses limites sont celles du nom accessible : un placeholder suffit à le satisfaire, et la comparaison par sous-chaîne laisse passer un libellé allongé.
- **Le texte choisi par position est instable** : c'est la seule stratégie avec un test qui échoue sans aucun changement. Le problème n'est pas le texte, c'est le `.first()` qui compense un texte présent plusieurs fois.
- **Ce qu'en tirer pour une suite** : les rôles par défaut, `exact: true` quand le libellé fait partie de ce qu'on vérifie, un `data-test` pour les éléments sans rôle ni nom, et pas de sélecteur CSS de structure ni de locator par position.

## Limites

- Une seule application et une suite de 5 tests : les proportions dépendent de la suite et des éléments qu'elle manipule.
- Les dix changements sont choisis à la main, comme des évolutions plausibles, pas tirés au hasard : la répartition entre les trois familles influence directement le bilan de chaque stratégie.
- Deux détections sont accidentelles (le CSS sur la `<div>`, le texte sur les cases sans nom) : elles comptent ici comme des détections, mais ne viennent pas de ce que le locator vérifie.
- La mesure s'est faite en plusieurs reprises : le build Angular était tué faute de mémoire dans une VM de 2 Go, puis deux changements étaient mal écrits dans le script (une syntaxe refusée par Angular, un retour en arrière impossible). Chaque reprise a remis le code d'origine et vérifié que les quatre suites étaient vertes ; aucun changement n'est compté sans ses deux runs complets.
- L'interface est un build Angular servi en statique, dans une image `amd64` émulée sur un Mac `arm64` : les durées absolues sont indicatives.
