import test from 'node:test';
import assert from 'node:assert/strict';

import { creerPartie } from '../js/moteur.js';
import {
    cleDuJour, cleValide, dateLisible, defiDuJour,
    avancement, objectifRempli, defiReussi, COUPS_DU_JOUR,
} from '../js/objectifs.js';
import { texteDuJour, textePartieLibre, lienSms, lireFragment, URL_JEU } from '../js/partage.js';

test('la clé du jour suit la date locale', () => {
    assert.equal(cleDuJour(new Date(2026, 7, 20)), '2026-08-20');
    assert.equal(cleDuJour(new Date(2026, 0, 3)), '2026-01-03');
    assert.ok(cleValide('2026-08-20'));
    assert.ok(!cleValide('20-08-2026'));
    assert.equal(dateLisible('2026-08-20'), '20/08/2026');
});

test('un même jour donne toujours le même défi', () => {
    assert.deepEqual(defiDuJour('2026-08-20'), defiDuJour('2026-08-20'));
    assert.notDeepEqual(defiDuJour('2026-08-20'), defiDuJour('2026-08-21'));
});

test('les commandes du jour sont plausibles', () => {
    for (let n = 0; n < 200; n += 1) {
        const jour = new Date(2026, 0, 1 + n);
        const defi = defiDuJour(cleDuJour(jour));
        assert.equal(defi.coupsMax, COUPS_DU_JOUR);
        assert.ok(defi.objectifs.length >= 3 && defi.objectifs.length <= 4);
        const recoltes = defi.objectifs.filter((o) => o.genre === 'recolte');
        assert.equal(recoltes.length, 2);
        assert.notEqual(recoltes[0].type, recoltes[1].type, 'deux fois la même couleur');
        for (const objectif of defi.objectifs) {
            assert.ok(objectif.quantite > 0 && objectif.quantite <= 25, `quantité ${objectif.quantite}`);
        }
        // Il faut pouvoir briser autant de gangues qu'on en demande.
        const gangue = defi.objectifs.find((o) => o.genre === 'gangue');
        assert.ok(gangue.quantite <= defi.gangues);
    }
});

test('une commande se remplit et le défi se conclut', () => {
    const defi = defiDuJour('2026-08-20');
    const partie = creerPartie(defi);
    assert.equal(defiReussi(partie, defi), false);
    for (const objectif of defi.objectifs) {
        assert.equal(avancement(partie, objectif), 0);
        if (objectif.genre === 'recolte') partie.recoltes[objectif.type] = objectif.quantite;
        else if (objectif.genre === 'gangue') partie.ganguesBrisees = objectif.quantite;
        else partie.speciales = objectif.quantite;
        assert.ok(objectifRempli(partie, objectif));
    }
    assert.equal(defiReussi(partie, defi), true);
});

test('le message du jour tient en peu de lignes et ne dévoile rien', () => {
    const defi = defiDuJour('2026-08-20');
    const partie = creerPartie(defi);
    partie.score = 24850;
    partie.coupsJoues = 17;
    for (const objectif of defi.objectifs) {
        if (objectif.genre === 'recolte') partie.recoltes[objectif.type] = objectif.quantite;
        else if (objectif.genre === 'gangue') partie.ganguesBrisees = objectif.quantite;
        else partie.speciales = objectif.quantite;
    }
    const texte = texteDuJour(defi, partie, true);
    const lignes = texte.split('\n');
    assert.equal(lignes.length, 3 + defi.objectifs.length);
    assert.match(lignes[0], /^Diamants 20\/08\/2026$/);
    assert.match(lignes[1], /^Réussi en 17\/22 coups · 24 850 pts$|^Réussi en 17\/22 coups · 24 850 pts$/);
    assert.equal(lignes.at(-1), `${URL_JEU}#jour=2026-08-20`);
    // Le lien porte la date, jamais la grille ni la solution.
    assert.ok(!texte.includes(defi.graine.replace('jour-', 'graine')));
    for (const ligne of lignes.slice(2, -1)) {
        assert.match(ligne, /^.{5,}\s\d+\/\d+$/u);
    }
});

test('une barre à moitié pleine ne s’affiche jamais comme terminée', () => {
    const defi = defiDuJour('2026-08-20');
    const partie = creerPartie(defi);
    const recolte = defi.objectifs.find((o) => o.genre === 'recolte');
    partie.recoltes[recolte.type] = recolte.quantite - 1;
    const ligne = texteDuJour(defi, partie, false).split('\n')[2];
    assert.ok(ligne.includes('◽'), 'il manque une pierre, la barre doit le montrer');
});

test('le lien SMS s’adapte à la ponctuation de chaque plateforme', () => {
    assert.match(lienSms('salut', 'Mozilla/5.0 (iPhone)'), /^sms:&body=salut$/);
    assert.match(lienSms('salut', 'Mozilla/5.0 (Linux; Android 14)'), /^sms:\?body=salut$/);
    assert.ok(lienSms('a\nb').includes('%0A'), 'les retours à la ligne sont encodés');
});

test('le fragment d’URL ramène au bon jour ou à la bonne graine', () => {
    assert.deepEqual(lireFragment('#jour=2026-08-20'), { genre: 'jour', valeur: '2026-08-20' });
    assert.deepEqual(lireFragment('#partie=abc-123'), { genre: 'partie', valeur: 'abc-123' });
    assert.equal(lireFragment('#nimporte'), null);
    assert.equal(lireFragment(''), null);
});

test('le résumé d’une partie libre reste court', () => {
    const partie = creerPartie({ graine: 'demo' });
    partie.score = 12000;
    partie.coupsJoues = 25;
    partie.cascadeMax = 4;
    const lignes = textePartieLibre('Partie en 25 coups', partie).split('\n');
    assert.equal(lignes.length, 4);
    assert.equal(lignes.at(-1), `${URL_JEU}#partie=demo`);
});
