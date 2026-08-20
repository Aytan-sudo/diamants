# Diamants

Match-3 statique pour navigateur, sur le thème des pierres précieuses. On échange deux pierres voisines pour en aligner au moins trois ; les cascades multiplient les points. Chaque jour, une grille identique pour tout le monde et des commandes à honorer en un nombre de coups fixe.

## Version 1.1

- grille 8 × 8, six couleurs de pierres, chacune avec sa propre forme ;
- échange de deux pierres voisines ; un échange qui n'aligne rien est refusé et ne coûte pas de coup ;
- gemmes taillées : éclat (quatre en ligne), bombe (croisement en L ou en T), diamant (cinq en ligne) ;
- gangue à briser, en une ou deux couches, qui se fend quand un alignement la touche ;
- chute en diagonale autour des blocs : aucune case ne reste orpheline ;
- rebattage déterministe quand plus aucun coup n'est possible ;
- quatre modes : défi du jour, partie en 25 coups, chrono 90 secondes, zen sans limite ;
- trois difficultés pour les parties libres (taille, nombre de couleurs, quantité de gangue) ;
- défi quotidien déterministe, une seule tentative, avec série ;
- partage par SMS : barres d'objectifs en emojis, lien portant la date ;
- reprise de partie par rejeu des coups (`localStorage`) ;
- pierres taillées en SVG : lumière, ombre, arêtes, table centrale et deux reflets ;
- éclats projetés, onde de choc, flash coloré et secousse du plateau sur les grosses cascades ;
- balayage lent de la lumière sur toute la vitrine, scintillements au hasard ;
- son de synthèse : la cascade monte une gamme pentatonique, chaque taille a son timbre ;
- cinq ambiances, dont quatre sombres, et quatre jeux de pierres, réglables séparément ;
- signes sur les pierres et animations sobres, en options d'accessibilité ;
- PWA hors ligne, aucune dépendance runtime, aucun fichier audio.

## Le remplissage, et pourquoi il est ce qu'il est

C'est le point délicat de tout match-3 quotidien. Si les nouvelles pierres sortaient d'un flux consommé au fil des coups, deux joueurs partis de la même date divergeraient au troisième mouvement : ils compareraient des scores obtenus sur des grilles différentes.

Ici la pierre qui tombe est une **fonction pure de sa colonne et de son rang d'arrivée** : `hacher(graine, 2, colonne, rang)`. Peu importe l'ordre des coups, la septième pierre de la colonne 3 est la même pour tout le monde. Même matière première, seule l'habileté fait la différence. Le test « la même graine et les mêmes coups donnent exactement la même partie » verrouille cette propriété.

Le même déterminisme sert la reprise de partie : une partie tient dans sa graine et la liste de ses coups, qu'il suffit de rejouer en silence pour la retrouver intacte.

## Le défi du jour

Tout est déduit de la date, rien n'est stocké : le 20 août 2026 donne le même plateau et les mêmes commandes à qui l'ouvre, aujourd'hui ou dans six mois. Deux récoltes de couleur, une commande de gangue, et une fois sur trois une commande de gemmes taillées — 22 coups pour honorer le tout.

Le message envoyé tient en un SMS et ne dévoile rien : le lien porte la date, jamais la grille ni la solution.

```
Diamants 20/08/2026
Réussi en 17/22 coups · 24 850 pts
🟢🟢🟢🟢🟢 19/19
🟡🟡🟡🟡🟡 15/15
🪨🪨🪨🪨🪨 5/5
https://aytan-sudo.github.io/diamants/#jour=2026-08-20
```

## Ce qui brille, et comment

Une pierre est faite de couches empilées dans le SVG : la couleur pleine, la
lumière qui vient du haut-gauche, l'ombre qui tombe à l'opposé, six arêtes qui
partent du centre et que la silhouette découpe en facettes, une table centrale,
deux reflets. Aucune de ces couches n'est animée — c'est la géométrie qui donne
la profondeur, et elle ne coûte rien à afficher. Les huit formes partagent la
même construction : seul le tracé change.

Le mouvement est réservé aux moments où il veut dire quelque chose. Un balayage
de lumière traverse le plateau toutes les huit secondes — un seul élément pour
soixante-quatre pierres, là où soixante-quatre scintillements coûteraient cher
pour ce qu'ils rapportent. Le scintillement, justement, est une étoile brève
posée au hasard, et il s'arrête dès que l'onglet passe en arrière-plan.

Le son est synthétisé à la volée : quelques oscillateurs, une enveloppe, aucun
fichier. La cascade monte une gamme pentatonique, si bien que la troisième
détonation d'un enchaînement sonne plus haut que la première — la main le sent
avant que l'œil ne lise le score.

## Architecture

- `js/moteur.js` : alignements, cascades, gemmes taillées, gangue, gravité, rebattage — aucune ligne de DOM ;
- `js/alea.js` : hachage déterministe et générateur pseudo-aléatoire reproductible ;
- `js/objectifs.js` : le défi du jour, déduit de la date ;
- `js/partage.js` : le message à envoyer, et le lien qui ramène à la bonne grille ;
- `js/rendu.js` : construction, animation et effets du plateau, sans aucune règle du jeu ;
- `js/son.js` : la synthèse audio, sans un octet d'échantillon ;
- `js/themes.js` : ambiances et jeux de pierres ;
- `js/storage.js` : stockage local avec repli en mémoire ;
- `js/app.js` : modes, entrées, tableau de bord, statistiques ;
- `css/palettes.css` : les ambiances et les couleurs de pierres, et rien d'autre ;
- `css/plateau.css` : la grille, la taille des pierres, et tout ce qui brille ;
- `css/interface.css` : tout ce qui entoure le plateau ;
- `tests/` : tests Node du moteur et du défi quotidien.

Le moteur ne connaît pas l'écran, le rendu ne connaît pas les règles : chaque étape d'un coup porte l'état complet du plateau et la liste des mouvements, le rendu se contente de rejouer ce récit.

## Développement

```bash
npm test      # tests du moteur et du défi du jour
npm run check # vérification syntaxique des modules
```

Aucune étape de build : la page se sert telle quelle.
