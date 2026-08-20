# Diamants

Match-3 statique pour navigateur, sur le thème des pierres précieuses. On échange deux pierres voisines pour en aligner au moins trois ; les cascades multiplient les points. Chaque jour, une grille identique pour tout le monde et des commandes à honorer en un nombre de coups fixe.

## Version 1.0

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
- cinq ambiances et quatre jeux de pierres, réglables séparément ;
- signes sur les pierres et animations sobres, en options d'accessibilité ;
- PWA hors ligne, aucune dépendance runtime.

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

## Architecture

- `js/moteur.js` : alignements, cascades, gemmes taillées, gangue, gravité, rebattage — aucune ligne de DOM ;
- `js/alea.js` : hachage déterministe et générateur pseudo-aléatoire reproductible ;
- `js/objectifs.js` : le défi du jour, déduit de la date ;
- `js/partage.js` : le message à envoyer, et le lien qui ramène à la bonne grille ;
- `js/rendu.js` : construction et animation du plateau, sans aucune règle du jeu ;
- `js/themes.js` : ambiances et jeux de pierres ;
- `js/storage.js` : stockage local avec repli en mémoire ;
- `js/app.js` : modes, entrées, tableau de bord, statistiques ;
- `css/palettes.css` : les ambiances et les couleurs de pierres, et rien d'autre ;
- `css/plateau.css` : la grille, les pierres et leurs mouvements ;
- `css/interface.css` : tout ce qui entoure le plateau ;
- `tests/` : tests Node du moteur et du défi quotidien.

Le moteur ne connaît pas l'écran, le rendu ne connaît pas les règles : chaque étape d'un coup porte l'état complet du plateau et la liste des mouvements, le rendu se contente de rejouer ce récit.

## Développement

```bash
npm test      # tests du moteur et du défi du jour
npm run check # vérification syntaxique des modules
```

Aucune étape de build : la page se sert telle quelle.
