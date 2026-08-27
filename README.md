# Diamants

Match-3 statique pour navigateur, sur le thème des pierres précieuses. On échange deux pierres voisines pour en aligner au moins trois ; les cascades multiplient les points. Chaque jour, une grille identique pour tout le monde et des commandes à honorer en un nombre de coups fixe.

## Version 1.3.1

- **les explosions retombent sur les pierres.** Le flash blanc était centré par
  `margin: -50% 0 0 -50%` : or un pourcentage de marge se résout sur la
  *largeur* du bloc conteneur, sur les quatre côtés. Le `margin-top` valait donc
  la moitié de la largeur du plateau — l'explosion partait à 165 px au-dessus et
  à gauche de la pierre qui la déclenchait. Le centrage passe par
  `translate(-50%, -50%)`, dont les pourcentages se résolvent bien sur la taille
  de l'élément.

  Le défaut existait depuis la 1.0 et n'a sauté aux yeux qu'en 1.3.0, quand le
  flash a gagné son cœur blanc et son `mix-blend-mode: screen`. Il n'était pas
  propre à un navigateur : Chrome et WebKit se trompaient identiquement, à
  0,1 px près. Un test structurel refuse désormais toute marge en pourcentage
  dans les feuilles du plateau et de l'interface.

## Version 1.3.0

Direction artistique retravaillée, d'après **Bejeweled 2** : couleurs pures,
halo permanent, fond d'arcade.

- **ambiance « Nébuleuse »**, nouvelle et par défaut : indigo presque noir,
  deux voiles de nébuleuse et un champ d'étoiles fixe. L'accent passe de l'or
  au cyan électrique, le métal des titres au chrome froid ;
- **jeu de pierres « Arcade »**, nouveau et par défaut : les sept couleurs
  pures de Bejeweled, posées sur les sept noms existants sans en renommer
  aucun — la topaze impériale est orange, la citrine est un quartz jaune,
  l'onyx blanc existe ;
- **halo permanent** autour de chaque pierre. Son rayon appartient à la
  palette (`--lueur`), pas au plateau : la Vitrine n'en porte que 2 px, où un
  halo franc ferait une bavure au lieu d'une lueur ;
- le **balayage de lumière** passe de 8 à 4,5 secondes et double de largeur ;
  les **scintillements** vont de 1,6 à 3 par seconde ;
- **proclamations** à l'échelle de Bejeweled — *Bien !*, *Excellent !*,
  *Superbe !*, *Prodigieux !*, *Irréel !* — dès la deuxième cascade, à la
  place du « Cascade ×3 » d'avant ;
- **explosions** à cœur blanc, anneau plus lumineux, sept éclats par pierre au
  lieu de cinq ;
- le **diamant devient un hypercube** : son arc-en-ciel défile en teinte ;
- **l'icône** reprend les couleurs Arcade et le fond de la Nébuleuse ;
- les cinq ambiances de la vitrine de bijoutier restent disponibles, ainsi que
  les quatre jeux de pierres d'origine.

Et, au passage, ce que le nouveau dialogue Options a obligé à régler :

- les pastilles de choix passent de 31 à **44 px** — la règle de la convention,
  qu'un dialogue fermé cachait au vérificateur iOS ;
- les réglages passent en colonne (libellé au-dessus, pastilles dessous) : côte
  à côte, six ambiances à 44 px s'empilaient sur cinq rangs ;
- le contenu du dialogue **défile** et la rangée d'actions reste collée en bas,
  si bien que « Fermer » ne part jamais hors de portée, même sur iPhone SE.

## Version 1.2.0

- **son audible sur téléphone** : les trois bruitages qui passaient sous les
  300 Hz (refus, gangue détruite, échec) remontent au-dessus du plancher du
  haut-parleur. Ils gardent leur geste — c'est la chute qui dit non, pas la
  profondeur ; seules les hauteurs bougent ;
- **icônes 180/192/512 en PNG** : iOS ignore un apple-touch-icon en SVG et
  fabriquait une icône d'accueil dégradée ;
- **plus de clignotement d'ambiance** : un script inline restaure l'ambiance
  mémorisée avant le premier rendu, au lieu de laisser la page s'ouvrir en
  Écrin puis basculer ;
- **vibration** en option, brève, à côté du réglage du son ;
- **service worker réseau d'abord** : une mise à jour publiée arrive sans
  manœuvre, le cache ne sert que hors ligne. Il s'appelle désormais
  `diamants-1.2.0` — la version exacte du paquet ;
- la version s'affiche au bas des Options, lue depuis le code réellement
  chargé : si un vieux cache est servi, c'est le vieux numéro qui s'affiche ;
- `user-scalable=no` et `touch-action: manipulation` : plus de zoom au
  double-tap sur les boutons ;
- `npm run serve` sur le port 8770 — un port par jeu, pour que les service
  workers de la collection cessent de se marcher dessus sur `localhost` ;
- deux suites de tests structurels : `tests/page.test.js` (concordance des
  versions, coquille complète, ids de la page, palettes complètes, viewport,
  manifeste) et `tests/son.test.js`, qui fait tourner le vrai module de son
  dans un contexte audio factice et refuse toute note sous 300 Hz.

## Version 1.1.1

- les cibles tactiles de l'interface passent à 44 px (boutons d'en-tête,
  boutons texte, listes déroulantes), conformément à la convention.
- les cases du plateau restent à 42 px et le déclarent (`data-cible-libre`) :
  huit colonnes espacées ne tiennent pas en 44 px sur un écran de 393 px.

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

À cette géométrie s'ajoute un halo permanent : chaque pierre pose sa propre
couleur autour d'elle. C'est ce qui fait basculer le plateau du côté de
l'arcade, et la mesure a été une surprise — soixante-quatre `drop-shadow`
statiques ne coûtent rien du tout, parce que rien ne les repeint tant que les
pierres ne bougent pas. Son rayon appartient à la palette : la Vitrine, seule
ambiance claire, n'en porte que 2 px.

Le mouvement de fond, lui, tient en un seul élément pour soixante-quatre
pierres : un balayage de lumière traverse le plateau toutes les quatre secondes
et demie. Faire miroiter chaque pierre pour elle-même, comme le fait Bejeweled,
serait soixante-quatre compositions par image sur un GPU de téléphone. On
obtient presque le même œil en semant des étoiles brèves — et là encore c'est la
mesure qui a tranché la cadence : à cinq par seconde, une image sur neuf passait
au-dessus de 20 ms ; à trois, plus aucune. Les étoiles s'arrêtent dès que
l'onglet passe en arrière-plan.

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
- `js/themes.js` : la liste des ambiances et des jeux de pierres, leur ordre ;
- `js/storage.js` : stockage local avec repli en mémoire ;
- `js/config.js` : le numéro de version, et rien d'autre ;
- `js/app.js` : modes, entrées, tableau de bord, statistiques ;
- `css/palettes.css` : les ambiances et les couleurs de pierres, et rien
  d'autre — y compris le rayon du halo et le champ d'étoiles, qui sont des
  propriétés de la palette et non du plateau ;
- `css/plateau.css` : la grille, la taille des pierres, et tout ce qui brille ;
- `css/interface.css` : tout ce qui entoure le plateau ;
- `tests/` : tests Node du moteur, du défi quotidien, du son et de la page.

Le moteur ne connaît pas l'écran, le rendu ne connaît pas les règles : chaque étape d'un coup porte l'état complet du plateau et la liste des mouvements, le rendu se contente de rejouer ce récit.

## Développement

```bash
npm test      # moteur, défi du jour, son, structure de la page
npm run check # vérification syntaxique des modules
npm run serve # http://localhost:8770
```

Aucune étape de build : la page se sert telle quelle.
