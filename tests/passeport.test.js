// Le compteur d'échanges du passeport.
//
// Il ne vit que dans l'espace d'un joueur : en mode invité il rend `null` et
// n'écrit rien, pour que le stockage du jeu reste exactement ce qu'il était
// avant le raccordement. Le reste est une affaire de journée : le compte
// repart à un le lendemain, et un compteur abîmé ne bloque pas la partie.

import test from 'node:test';
import assert from 'node:assert/strict';

import { compterEchangePasseport } from '../js/storage.js';

const espaceDeTest = () => {
    const memoire = new Map();
    return {
        memoire,
        getItem: (cle) => memoire.get(cle) ?? null,
        setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
        removeItem: (cle) => memoire.delete(cle),
    };
};

test('en mode invité, rien n’est compté ni écrit', () => {
    assert.equal(compterEchangePasseport('2026-09-16', null), null);
});

test('les échanges de la journée s’additionnent, et repartent le lendemain', () => {
    const espace = espaceDeTest();
    assert.equal(compterEchangePasseport('2026-09-16', espace), 1);
    for (let i = 2; i <= 20; i++) compterEchangePasseport('2026-09-16', espace);
    assert.equal(JSON.parse(espace.getItem('diamants:passeport')).echanges, 20);
    assert.equal(compterEchangePasseport('2026-09-17', espace), 1);
});

test('un compteur illisible ou incohérent repart de un', () => {
    const espace = espaceDeTest();
    espace.setItem('diamants:passeport', '{ abîmé');
    assert.equal(compterEchangePasseport('2026-09-17', espace), 1);
    espace.setItem('diamants:passeport', JSON.stringify({ jour: '2026-09-17', echanges: 'beaucoup' }));
    assert.equal(compterEchangePasseport('2026-09-17', espace), 1);
});
