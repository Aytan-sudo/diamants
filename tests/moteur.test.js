import test from 'node:test';
import assert from 'node:assert/strict';

import {
    creerPartie, jouer, existeCoup, alignementsPresents, coupPossible,
    estGemme, estGangue, restaurerCases, copieCases,
    ECLAT_H, BOMBE, DIAMANT,
} from '../js/moteur.js';

const LETTRES = {
    R: 'rubis', E: 'emeraude', S: 'saphir', A: 'amethyste',
    T: 'topaze', Q: 'quartz', O: 'onyx',
};

// Un damier à trois couleurs décalé d'une ligne à l'autre : aucun alignement
// nulle part, un fond neutre sur lequel poser la figure à tester.
function dessinCalme(colonnes, lignes) {
    const base = ['R', 'E', 'S'];
    const grille = [];
    for (let r = 0; r < lignes; r += 1) {
        const ligne = [];
        for (let c = 0; c < colonnes; c += 1) ligne.push(base[(c + r) % 3]);
        grille.push(ligne);
    }
    return grille;
}

function partieDessinee(dessin, options = {}) {
    const partie = creerPartie({ graine: 'test', ...options });
    restaurerCases(partie, dessin.flat().map((lettre) => {
        if (lettre === 'x') return { gangue: 1 };
        if (lettre === 'X') return { gangue: 2 };
        return { type: LETTRES[lettre], special: null };
    }));
    return partie;
}

const idx = (partie, c, r) => r * partie.colonnes + c;

function premierCoup(partie) {
    for (let i = 0; i < partie.cases.length; i += 1) {
        const c = i % partie.colonnes;
        const r = Math.floor(i / partie.colonnes);
        if (c < partie.colonnes - 1 && coupPossible(partie, i, i + 1)) return [i, i + 1];
        if (r < partie.lignes - 1 && coupPossible(partie, i, i + partie.colonnes)) {
            return [i, i + partie.colonnes];
        }
    }
    return null;
}

test('la grille de départ est pleine, calme et jouable', () => {
    for (const graine of ['jour-2026-08-20', 'alpha', 'bêta', '42']) {
        const partie = creerPartie({ graine, gangues: 5 });
        assert.equal(partie.cases.filter((cel) => cel === null).length, 0, `${graine} : des trous`);
        assert.ok(!alignementsPresents(partie), `${graine} : un alignement dès le départ`);
        assert.ok(existeCoup(partie), `${graine} : aucun coup jouable`);
        assert.equal(partie.ganguesPosees, 5);
    }
});

test('la gangue ne descend jamais sur la première ligne', () => {
    for (let n = 0; n < 30; n += 1) {
        const partie = creerPartie({ graine: `gangue-${n}`, gangues: 8 });
        for (let c = 0; c < partie.colonnes; c += 1) {
            assert.ok(!estGangue(partie.cases[c]), 'un bloc bouche la source d’une colonne');
        }
    }
});

test('un échange sans alignement est refusé et ne coûte pas de coup', () => {
    const partie = partieDessinee(dessinCalme(8, 8), { coupsMax: 20 });
    const resultat = jouer(partie, idx(partie, 0, 0), idx(partie, 1, 0));
    assert.equal(resultat.valide, false);
    assert.equal(resultat.raison, 'sansEffet');
    assert.equal(partie.coupsJoues, 0);
    assert.equal(partie.score, 0);
});

test('quatre gemmes alignées donnent un éclat, sous le doigt du joueur', () => {
    const dessin = dessinCalme(8, 8);
    for (const c of [1, 2, 4]) dessin[6][c] = 'T';
    dessin[6][3] = 'A';
    dessin[7][3] = 'T';
    const partie = partieDessinee(dessin);
    const resultat = jouer(partie, idx(partie, 3, 6), idx(partie, 3, 7));
    assert.equal(resultat.valide, true);
    const creations = resultat.etapes[0].creations;
    assert.equal(creations.length, 1);
    assert.equal(creations[0].special, ECLAT_H);
    assert.equal(creations[0].index, idx(partie, 3, 6));
    assert.equal(creations[0].type, 'topaze');
});

test('cinq gemmes alignées donnent un diamant sans couleur', () => {
    const dessin = dessinCalme(8, 8);
    for (const c of [1, 2, 4, 5]) dessin[6][c] = 'T';
    dessin[6][3] = 'A';
    dessin[7][3] = 'T';
    const partie = partieDessinee(dessin);
    const creations = jouer(partie, idx(partie, 3, 6), idx(partie, 3, 7)).etapes[0].creations;
    assert.equal(creations.length, 1);
    assert.equal(creations[0].special, DIAMANT);
    assert.equal(creations[0].type, null);
});

test('un croisement en L donne une bombe', () => {
    const dessin = dessinCalme(8, 8);
    dessin[6][1] = 'T';
    dessin[6][2] = 'T';
    dessin[4][3] = 'T';
    dessin[5][3] = 'T';
    dessin[6][3] = 'A';
    dessin[7][3] = 'T';
    const partie = partieDessinee(dessin);
    const creations = jouer(partie, idx(partie, 3, 6), idx(partie, 3, 7)).etapes[0].creations;
    assert.equal(creations.length, 1);
    assert.equal(creations[0].special, BOMBE);
});

// Trois gemmes exactement : aucune spéciale ne naît sur la case du doigt, qui
// s'efface donc bel et bien et fend le bloc posé juste au-dessus d'elle.
function partieAvecGangue(marque) {
    const dessin = dessinCalme(8, 8);
    dessin[6][0] = 'T';
    dessin[6][1] = 'T';
    dessin[6][2] = 'A';
    dessin[7][2] = 'T';
    dessin[5][2] = marque;
    return partieDessinee(dessin);
}

test('un alignement voisin fend la gangue épaisse sans la briser', () => {
    const partie = partieAvecGangue('X');
    const resultat = jouer(partie, idx(partie, 2, 6), idx(partie, 2, 7));
    assert.equal(resultat.valide, true);
    const brisees = resultat.etapes[0].brisees;
    assert.equal(brisees.length, 1);
    assert.equal(brisees[0].index, idx(partie, 2, 5));
    assert.equal(brisees[0].couches, 1, 'une seule couche à la fois');
});

test('une gangue mince cède du premier coup et laisse la place', () => {
    const partie = partieAvecGangue('x');
    const resultat = jouer(partie, idx(partie, 2, 6), idx(partie, 2, 7));
    const brisees = resultat.etapes[0].brisees;
    assert.equal(brisees.length, 1);
    assert.equal(brisees[0].couches, 0);
    assert.ok(partie.ganguesBrisees >= 1);
    assert.ok(estGemme(partie.cases[idx(partie, 2, 5)]), 'une gemme occupe la place libérée');
});

test('le plateau reste plein, coup après coup, même semé de gangue', () => {
    const partie = creerPartie({ graine: 'plein', gangues: 8 });
    for (let n = 0; n < 60; n += 1) {
        const coup = premierCoup(partie);
        assert.ok(coup, `plus aucun coup au tour ${n}`);
        jouer(partie, coup[0], coup[1]);
        assert.equal(partie.cases.filter((cel) => cel === null).length, 0, `un trou au tour ${n}`);
        assert.ok(!alignementsPresents(partie), `un alignement laissé en place au tour ${n}`);
        assert.ok(existeCoup(partie), `grille bloquée au tour ${n}`);
    }
});

// Le test qui compte : sans lui, la grille du jour n'est pas la même pour tous.
test('la même graine et les mêmes coups donnent exactement la même partie', () => {
    const rejouer = () => {
        const partie = creerPartie({ graine: 'jour-2026-08-20', gangues: 6 });
        const coups = [];
        for (let n = 0; n < 25; n += 1) {
            const coup = premierCoup(partie);
            if (!coup) break;
            coups.push(coup);
            jouer(partie, coup[0], coup[1]);
        }
        return { partie, coups };
    };
    const a = rejouer();
    const b = rejouer();
    assert.deepEqual(a.coups, b.coups);
    assert.deepEqual(copieCases(a.partie), copieCases(b.partie));
    assert.equal(a.partie.score, b.partie.score);
    assert.deepEqual(a.partie.recoltes, b.partie.recoltes);
    assert.equal(a.partie.ganguesBrisees, b.partie.ganguesBrisees);
});

test('un coup refusé ne décale pas le flux de remplissage', () => {
    const attendu = creerPartie({ graine: 'flux' });
    const teste = creerPartie({ graine: 'flux' });
    jouer(teste, 0, 1);                       // très probablement sans effet
    jouer(teste, 0, teste.colonnes * 4);      // cases éloignées : refusé
    const coup = premierCoup(attendu);
    jouer(attendu, coup[0], coup[1]);
    jouer(teste, coup[0], coup[1]);
    assert.deepEqual(copieCases(teste), copieCases(attendu));
});

test('le budget de coups termine la partie', () => {
    const partie = creerPartie({ graine: 'budget', coupsMax: 3 });
    for (let n = 0; n < 3; n += 1) {
        const coup = premierCoup(partie);
        jouer(partie, coup[0], coup[1]);
    }
    assert.equal(partie.termine, true);
    assert.equal(jouer(partie, 0, 1).raison, 'terminee');
});

test('les scores montent avec la cascade et rien ne se perd', () => {
    const partie = creerPartie({ graine: 'score' });
    const coup = premierCoup(partie);
    const resultat = jouer(partie, coup[0], coup[1]);
    const total = resultat.etapes.reduce((somme, etape) => somme + etape.points, 0);
    assert.equal(partie.score, total);
    assert.ok(partie.score > 0);
    assert.ok(partie.cases.every((cel) => estGemme(cel) || estGangue(cel)));
});
