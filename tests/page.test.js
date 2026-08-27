// Les vérifications structurelles : les fautes qui ne lèvent aucune erreur.
//
// Un id renommé dans la page, une variable oubliée dans une ambiance, un
// module absent de la coquille du service worker — rien de tout cela ne plante.
// Le jeu s'ouvre, et c'est plus tard, sur un téléphone hors ligne ou dans un
// thème sombre trouvé clair, que ça se voit. D'où cette suite, qui relit les
// fichiers du dépôt au lieu de faire tourner le jeu.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VERSION } from '../js/config.js';
import { AMBIANCES, JEUX_DE_PIERRES, REGLAGES_PAR_DEFAUT } from '../js/themes.js';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(racine, chemin), 'utf8');

const page = lire('index.html');
const app = lire('js/app.js');
const worker = lire('sw.js');
const paquet = JSON.parse(lire('package.json'));
const manifeste = JSON.parse(lire('manifest.webmanifest'));
const palettes = lire('css/palettes.css');

// La coquille du service worker, telle qu'elle est écrite.
const coquille = [...worker.matchAll(/^\s+'([^']+)',$/gm)].map(([, chemin]) => chemin);

test('la version concorde entre le paquet, l’interface et le cache', () => {
    assert.equal(paquet.version, VERSION);
    assert.ok(worker.includes(`const VERSION = 'diamants-${VERSION}'`), 'le cache ne porte pas la version');
    assert.ok(page.includes(`Diamants ${VERSION}`), 'la ligne de version des Options est périmée');
    assert.ok(app.includes('Diamants ${VERSION}'), 'la page affiche un numéro figé au lieu du code chargé');
});

test('le service worker emporte tous les fichiers du jeu', () => {
    const attendus = [
        ...readdirSync(join(racine, 'js')).map((nom) => `js/${nom}`),
        ...readdirSync(join(racine, 'css')).map((nom) => `css/${nom}`),
        ...readdirSync(join(racine, 'assets')).map((nom) => `assets/${nom}`),
        'index.html', 'manifest.webmanifest',
    ];
    const oublies = attendus.filter((chemin) => !coquille.includes(chemin));
    assert.deepEqual(oublies, [], 'absents de la coquille');
    const fantomes = coquille.filter((chemin) => chemin !== './' && !existsSync(join(racine, chemin)));
    assert.deepEqual(fantomes, [], 'mis en cache mais inexistants');
});

test('le service worker sert le réseau d’abord, le cache en secours', () => {
    // Cache d'abord, c'est une mise à jour qui n'arrive jamais — et, sur
    // localhost où tous les jeux partagent l'origine, les fichiers d'un jeu
    // servis à un autre.
    const reponse = worker.slice(worker.indexOf('respondWith'));
    assert.ok(reponse.indexOf('fetch(') < reponse.indexOf('caches.match'), 'le cache passe avant le réseau');
    assert.ok(worker.includes('skipWaiting()') && worker.includes('clients.claim()'));
    assert.ok(worker.includes('caches.delete'), 'les anciens caches ne sont pas purgés');
    assert.ok(app.includes("navigator.serviceWorker.register('./sw.js')"));
});

test('chaque id cherché par le code existe dans la page', () => {
    const ids = [...app.matchAll(/\bel\('([\w-]+)'\)/g)].map(([, id]) => id);
    assert.ok(ids.length > 20, `${ids.length} ids relevés seulement`);
    const manquants = [...new Set(ids)].filter((id) => !page.includes(`id="${id}"`));
    assert.deepEqual(manquants, []);
});

test('chaque ambiance et chaque jeu de pierres définit toute sa palette', () => {
    // Une variable oubliée ne plante pas : elle laisse une couleur claire au
    // milieu d'un thème sombre.
    const sansCommentaires = palettes.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocs = [...sansCommentaires.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selecteur, corps]) => ({
        selecteur,
        variables: [...corps.matchAll(/(--[\w-]+)\s*:/g)].map(([, nom]) => nom),
    }));
    const variablesDe = (attribut, cle) => {
        const bloc = blocs.find(({ selecteur }) => selecteur.includes(`[data-${attribut}="${cle}"]`));
        assert.ok(bloc, `aucun bloc pour ${attribut}="${cle}"`);
        return bloc.variables;
    };
    for (const [attribut, liste] of [['ambiance', AMBIANCES], ['pierres', JEUX_DE_PIERRES]]) {
        const reference = variablesDe(attribut, liste[0].cle);
        assert.ok(reference.length > 4, `palette de référence ${attribut} trop maigre`);
        for (const { cle } of liste.slice(1)) {
            const manquantes = reference.filter((nom) => !variablesDe(attribut, cle).includes(nom));
            assert.deepEqual(manquantes, [], `${attribut}="${cle}"`);
        }
    }
});

test('la collection compte 4 à 6 ambiances, toutes offertes dans les Options', () => {
    assert.ok(AMBIANCES.length >= 4 && AMBIANCES.length <= 6, `${AMBIANCES.length} ambiances`);
    assert.ok(page.includes('id="choix-ambiance"') && page.includes('id="choix-pierres"'));
    for (const cle of ['ambiance', 'pierres', 'difficulte', 'symboles', 'son', 'vibration', 'mouvement']) {
        assert.ok(page.includes(`id="choix-${cle}"`), `le réglage ${cle} n'a pas de place dans les Options`);
        assert.ok(cle in REGLAGES_PAR_DEFAUT || cle === 'difficulte', `le réglage ${cle} n'a pas de défaut`);
    }
});

test('l’ambiance par défaut est celle que le CSS sert sans attribut', () => {
    // Piège : `REGLAGES_PAR_DEFAUT` dit Nébuleuse, mais tant que rien n'a posé
    // `data-ambiance`, c'est le bloc `:root` nu qui peint. Si les deux
    // divergent, un joueur sans préférence enregistrée voit une palette pendant
    // le premier rendu et une autre dès que le script inline a tourné.
    const sansCommentaires = palettes.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [attribut, defaut] of [
        ['ambiance', REGLAGES_PAR_DEFAUT.ambiance],
        ['pierres', REGLAGES_PAR_DEFAUT.pierres],
    ]) {
        const nu = sansCommentaires.match(new RegExp(`:root,\\s*:root\\[data-${attribut}="([\\w-]+)"\\]`));
        assert.ok(nu, `aucun bloc :root nu pour ${attribut}`);
        assert.equal(nu[1], defaut, `le CSS sert ${nu[1]} sans attribut, le défaut est ${defaut}`);
    }
});

test('aucun effet n’est centré par une marge en pourcentage', () => {
    // Le piège qui a décalé les explosions de 165 px pendant trois versions :
    // un pourcentage de marge se résout sur la LARGEUR du bloc conteneur, sur
    // les quatre côtés. `margin-top: -50%` sur un effet posé dans la couche du
    // plateau valait donc la moitié de la largeur du plateau, pas la moitié de
    // la hauteur de l'effet. Rien ne le signale : ni erreur, ni avertissement,
    // et les deux moteurs sont d'accord pour se tromper pareil. Le centrage
    // d'un élément se fait par `translate`, dont les pourcentages se résolvent
    // bien sur la taille de l'élément.
    const styles = `${lire('css/plateau.css')}\n${lire('css/interface.css')}`;
    const sansCommentaires = styles.replace(/\/\*[\s\S]*?\*\//g, '');
    const fautives = [...sansCommentaires.matchAll(/(margin[\w-]*)\s*:\s*([^;{}]*%[^;{}]*);/g)]
        .map(([, propriete, valeur]) => `${propriete}: ${valeur.trim()}`);
    assert.deepEqual(fautives, []);
});

test('les proclamations montent, et commencent à la deuxième cascade', () => {
    const rendu = lire('js/rendu.js');
    const echelle = rendu.match(/const PROCLAMATIONS = \[([^\]]+)\]/);
    assert.ok(echelle, 'pas d’échelle de proclamations');
    const marches = echelle[1].split(',').filter((m) => m.trim());
    assert.ok(marches.length >= 4, `${marches.length} marches seulement`);
    assert.ok(rendu.includes('etape.cascade >= 2'), 'la première cascade enchaînée ne dit rien');
});

test('l’ambiance mémorisée est posée avant le premier rendu', () => {
    // Sinon la page s'ouvre en Écrin puis clignote vers l'ambiance choisie.
    const tete = page.slice(0, page.indexOf('</head>'));
    assert.ok(tete.includes("localStorage.getItem('diamants:reglages')"), 'pas de script inline de restauration');
    // Inline et sans `type="module"` : un module est différé, il s'exécuterait
    // après la peinture — exactement le clignotement qu'on cherche à éviter.
    const inline = tete.slice(tete.indexOf('<script'));
    assert.ok(inline.startsWith('<script>'), 'le script de restauration est différé');
    // Le script inline connaît sa propre liste : elle doit suivre themes.js.
    for (const { cle } of [...AMBIANCES, ...JEUX_DE_PIERRES]) {
        assert.ok(tete.includes(cle), `${cle} manque au script de restauration`);
    }
});

test('la page tient la convention mobile et PWA', () => {
    const viewport = page.match(/<meta name="viewport" content="([^"]+)"/)[1];
    for (const morceau of ['width=device-width', 'viewport-fit=cover', 'user-scalable=no']) {
        assert.ok(viewport.includes(morceau), `viewport sans ${morceau}`);
    }
    assert.ok(page.includes('id="couleur-barre"'), 'la barre de statut ne suit pas la palette');
    // iOS ignore l'apple-touch-icon en SVG et dégrade l'icône d'accueil.
    const apple = page.match(/rel="apple-touch-icon" href="([^"]+)"/)[1];
    assert.ok(apple.endsWith('.png'), `apple-touch-icon en ${apple}`);
    assert.ok(existsSync(join(racine, apple)));
    // Chemins relatifs simples : `css/…`, pas `./css/…`.
    assert.deepEqual([...page.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map(([, c]) => c), []);
    assert.ok(page.includes('data-cible-libre='), 'le plateau ne déclare pas son exemption des 44 px');
});

test('le manifeste porte les quatre icônes et le mode autonome', () => {
    assert.equal(manifeste.display, 'standalone');
    assert.equal(manifeste.start_url, './');
    for (const champ of ['name', 'short_name', 'description', 'orientation', 'theme_color', 'background_color']) {
        assert.ok(manifeste[champ], `manifeste sans ${champ}`);
    }
    assert.equal(manifeste.icons.length, 4);
    for (const icone of manifeste.icons) assert.ok(existsSync(join(racine, icone.src)), icone.src);
    for (const taille of ['192x192', '512x512']) {
        assert.ok(manifeste.icons.some((i) => i.sizes === taille && i.type === 'image/png'), `pas d'icône ${taille}`);
    }
});

test('npm run check passe sur chaque module', () => {
    const modules = readdirSync(join(racine, 'js')).filter((nom) => nom.endsWith('.js'));
    const oublies = modules.filter((nom) => !paquet.scripts.check.includes(`js/${nom}`));
    assert.deepEqual(oublies, []);
    assert.ok(paquet.scripts.serve, 'pas de npm run serve');
    // Un port par jeu : sur localhost, les jeux partagent origine et caches.
    assert.ok(!paquet.scripts.serve.includes('8765'), 'le port 8765 est partagé par la moitié de la collection');
});
