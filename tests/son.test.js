// Le son — tout ce qui se vérifie sans oreille.
//
// Le piège que cette suite existe pour attraper ne lève aucune erreur et ne se
// voit pas depuis un ordinateur : une note écrite sous 300 Hz part bien, elle
// n'arrive simplement jamais. Un haut-parleur de téléphone ne restitue à peu
// près rien en dessous, et l'oreille y est de surcroît moins sensible à faible
// volume. Compter les notes émises ne dit donc rien de ce qui parvient à
// l'oreille : c'est leur hauteur qu'il faut relever.
//
// On ne relit pas le module au lexique : un contexte audio factice fait tourner
// le vrai code et note ce qui en sort, rampes de glissando comprises. Le relevé
// à la source reste en second rideau, pour attraper un timbre ajouté demain
// sans passer par ici.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Un haut-parleur de téléphone ne descend pas plus bas. C'est la cible du
// projet : sous ce seuil, la note n'existe pas.
const PLANCHER = 300;

const emises = [];

// Le banc d'essai : juste assez d'API WebAudio pour que `js/son.js` tourne, et
// un carnet où chaque oscillateur laisse ses hauteurs.
class Parametre {
    constructor(carnet) { this.carnet = carnet; this.value = 0; }
    setValueAtTime(valeur) { this.carnet?.push(valeur); return this; }
    exponentialRampToValueAtTime(valeur) { this.carnet?.push(valeur); return this; }
}

class Contexte {
    constructor() {
        this.currentTime = 0;
        this.sampleRate = 48000;
        this.state = 'running';
        this.destination = {};
    }

    createOscillator() {
        const note = { forme: null, hauteurs: [], debut: null, fin: null };
        emises.push(note);
        return {
            set type(valeur) { note.forme = valeur; },
            get type() { return note.forme; },
            frequency: new Parametre(note.hauteurs),
            connect: (cible) => cible,
            start: (temps) => { note.debut = temps; },
            stop: (temps) => { note.fin = temps; },
        };
    }

    createGain() { return { gain: new Parametre(null), connect: (cible) => cible }; }
    createBuffer(canaux, echantillons) { return { getChannelData: () => new Float32Array(echantillons) }; }
    createBufferSource() { return { buffer: null, connect: (cible) => cible, start: () => {} }; }
    createBiquadFilter() {
        return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: (cible) => cible };
    }

    resume() { this.state = 'running'; }
}

globalThis.AudioContext = Contexte;
const son = await import('../js/son.js');

function jouer(timbre) {
    const debut = emises.length;
    timbre();
    return emises.slice(debut);
}

const choisir = jouer(son.choisir);
const refus = jouer(son.refuser);
const cascades = [1, 2, 3, 5].map((rang) => jouer(() => son.alignement(rang, 3)));
const eclat = jouer(() => son.taillee('eclat'));
const diamant = jouer(son.diamantActive);
const gangueFendue = jouer(() => son.gangue(false));
const gangueDetruite = jouer(() => son.gangue(true));
const victoire = jouer(son.victoire);
const echec = jouer(son.echec);

test('tous les timbres sonnent', () => {
    assert.ok(emises.length > 20, `${emises.length} notes seulement`);
    for (const timbre of [choisir, refus, eclat, diamant, gangueDetruite, victoire, echec]) {
        assert.ok(timbre.length > 0);
    }
    // La gangue qui se fend n'est que du souffle filtré : aucun oscillateur.
    assert.equal(gangueFendue.length, 0);
});

test('aucune note ne passe sous le plancher du haut-parleur', () => {
    const sous = emises.flatMap((note) => note.hauteurs).filter((hauteur) => hauteur < PLANCHER);
    assert.deepEqual(sous.map((hauteur) => Math.round(hauteur)), []);
});

test('le refus dit non par sa chute, pas par sa profondeur', () => {
    assert.equal(refus.length, 1);
    const [depart, arrivee] = refus[0].hauteurs;
    assert.ok(depart > arrivee, `${depart} → ${arrivee}`);
    assert.ok(arrivee >= PLANCHER);
    // Et il ne se confond pas avec le tapotement de sélection, qui est plus haut.
    assert.ok(depart < choisir[0].hauteurs[0]);
});

test('l’échec descend de bout en bout', () => {
    const chute = echec.map((note) => note.hauteurs[0]);
    assert.equal(chute.length, 3);
    assert.ok(chute.every((h, rang) => rang === 0 || h < chute[rang - 1]), chute.join(' → '));
    assert.ok(echec.every((note, rang) => rang === 0 || note.debut > echec[rang - 1].debut));
});

test('la victoire monte, et s’égrène au lieu de plaquer un accord', () => {
    const montee = victoire.map((note) => note.hauteurs[0]);
    assert.ok(montee.every((h, rang) => rang === 0 || h > montee[rang - 1]), montee.join(' '));
    assert.ok(victoire.every((note, rang) => rang === 0 || note.debut > victoire[rang - 1].debut));
});

test('la cascade monte la gamme au fil des enchaînements', () => {
    // Le cœur du plaisir : la main sent la cascade avant que l'œil ne lise le
    // score. C'est donc une règle du jeu, pas une décoration.
    const fondamentales = cascades.map((notes) => notes[0].hauteurs[0]);
    assert.ok(
        fondamentales.every((h, rang) => rang === 0 || h > fondamentales[rang - 1]),
        fondamentales.map(Math.round).join(' '),
    );
});

test('aucune fréquence écrite dans le module ne passe sous le plancher', () => {
    // Second rideau : un timbre ajouté demain sans être joué ci-dessus
    // échapperait au banc d'essai.
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'son.js'), 'utf8');
    const ecrites = [...source.matchAll(/hauteur:\s*(\d+)/g)].map(([, valeur]) => Number(valeur));
    assert.ok(ecrites.length >= 3, `${ecrites.length} fréquences relevées`);
    assert.deepEqual(ecrites.filter((hauteur) => hauteur < PLANCHER), []);
});

test('le contexte audio se prépare sur un geste d’activation', () => {
    // Second piège du son sur téléphone : iOS ne démarre un contexte audio que
    // depuis pointerdown/touchstart/pointerup/touchend/keydown/click. Diamants
    // décide son coup sur `pointermove`, qui n'en est pas un — d'où le filet
    // posé sur le document dès le premier poser de doigt.
    const app = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'app.js'), 'utf8');
    const filet = app.match(/for \(const geste of \[([^\]]+)\]\)[\s\S]{0,120}?son\.reveiller\(\)/);
    assert.ok(filet, 'aucun réveil du son sur un geste');
    assert.ok(filet[1].includes("'pointerdown'"), filet[1]);
    assert.ok(app.includes('document.addEventListener(geste'), 'le filet n’est pas posé sur le document');
});
