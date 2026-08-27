// Le son, synthétisé à la volée.
//
// Aucun fichier audio : quelques oscillateurs et une enveloppe suffisent, et
// le jeu reste un dossier de texte qui fonctionne hors ligne. Les navigateurs
// refusent de faire du bruit avant un geste de l'utilisateur — le contexte
// n'est donc créé qu'au premier clic, et jamais avant.

let contexte = null;
let sortie = null;
let actif = true;

function studio() {
    if (contexte) {
        if (contexte.state === 'suspended') contexte.resume();
        return contexte;
    }
    const Fabrique = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Fabrique) return null;
    contexte = new Fabrique();
    sortie = contexte.createGain();
    sortie.gain.value = 0.5;
    sortie.connect(contexte.destination);
    return contexte;
}

export function reveiller() {
    if (actif) studio();
}

export function reglerSon(valeur) {
    actif = valeur;
    if (actif) studio();
}

export function sonActif() {
    return actif;
}

// Une note : une onde, une enveloppe qui monte vite et redescend, et c'est
// tout. Le glissando sert aux sons qui filent (le refus, la chute).
function note({ hauteur, duree = 0.18, forme = 'sine', force = 0.2, glissando = 0, retard = 0 }) {
    const audio = studio();
    if (!audio) return;
    const debut = audio.currentTime + retard;
    const oscillateur = audio.createOscillator();
    const enveloppe = audio.createGain();
    oscillateur.type = forme;
    oscillateur.frequency.setValueAtTime(hauteur, debut);
    if (glissando) oscillateur.frequency.exponentialRampToValueAtTime(hauteur * glissando, debut + duree);
    enveloppe.gain.setValueAtTime(0.0001, debut);
    enveloppe.gain.exponentialRampToValueAtTime(force, debut + 0.012);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    oscillateur.connect(enveloppe).connect(sortie);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.02);
}

// Du bruit filtré : le grain d'une pierre qui se fend.
function souffle({ duree = 0.22, force = 0.25, coupure = 1400, retard = 0 }) {
    const audio = studio();
    if (!audio) return;
    const debut = audio.currentTime + retard;
    const echantillons = Math.floor(audio.sampleRate * duree);
    const tampon = audio.createBuffer(1, echantillons, audio.sampleRate);
    const piste = tampon.getChannelData(0);
    for (let i = 0; i < echantillons; i += 1) {
        piste[i] = (Math.random() * 2 - 1) * (1 - i / echantillons);
    }
    const source = audio.createBufferSource();
    source.buffer = tampon;
    const filtre = audio.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = coupure;
    filtre.Q.value = 0.9;
    const enveloppe = audio.createGain();
    enveloppe.gain.setValueAtTime(force, debut);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    source.connect(filtre).connect(enveloppe).connect(sortie);
    source.start(debut);
}

// Gamme pentatonique : n'importe quelle suite de degrés y sonne juste, ce qui
// est exactement ce qu'il faut quand c'est la longueur d'une cascade qui
// choisit les notes.
const DEGRES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const DO5 = 523.25;
const degre = (n) => DO5 * Math.pow(2, DEGRES[Math.min(n, DEGRES.length - 1)] / 12);

export function choisir() {
    if (!actif) return;
    note({ hauteur: 880, duree: 0.07, forme: 'triangle', force: 0.09 });
}

// Un refus dit non par sa chute, pas par sa profondeur : sous 300 Hz un
// haut-parleur de téléphone ne restitue rien, et la scie partait à 190 Hz pour
// finir à 137 — un non que personne n'entendait en jouant au doigt. Même
// glissade, une octave et demie plus haut : 460 vers 331 Hz.
export function refuser() {
    if (!actif) return;
    note({ hauteur: 460, duree: 0.14, forme: 'sawtooth', force: 0.1, glissando: 0.72 });
}

// Le cœur du plaisir : la cascade monte la gamme. Trois pierres au troisième
// enchaînement sonnent plus haut que trois pierres au premier, et la main le
// sent avant que l'œil ne lise le score.
export function alignement(cascade, pierres) {
    if (!actif) return;
    const rang = Math.min(cascade - 1, DEGRES.length - 2);
    note({ hauteur: degre(rang), duree: 0.24, forme: 'sine', force: 0.22 });
    note({ hauteur: degre(rang) * 2, duree: 0.16, forme: 'sine', force: 0.07, retard: 0.01 });
    if (pierres >= 5) note({ hauteur: degre(rang + 2), duree: 0.3, forme: 'sine', force: 0.12, retard: 0.06 });
}

export function taillee(special) {
    if (!actif) return;
    const suite = special === 'diamant' ? [4, 6, 8, 10] : [3, 5, 7];
    suite.forEach((rang, i) => {
        note({ hauteur: degre(rang), duree: 0.2, forme: 'triangle', force: 0.14, retard: i * 0.055 });
    });
}

// Le souffle porte le grain de la pierre et ne bouge pas ; seul le toc qui
// l'accompagne remonte au-dessus du plancher (520 vers 328 Hz au lieu de 130
// vers 78, où il n'existait que sur un ordinateur).
export function gangue(detruite) {
    if (!actif) return;
    souffle({ duree: detruite ? 0.3 : 0.16, force: detruite ? 0.28 : 0.16, coupure: detruite ? 900 : 1800 });
    if (detruite) note({ hauteur: 520, duree: 0.22, forme: 'sine', force: 0.16, glissando: 0.63 });
}

export function diamantActive() {
    if (!actif) return;
    for (let i = 0; i < 7; i += 1) {
        note({ hauteur: degre(i + 2), duree: 0.35, forme: 'sine', force: 0.1, retard: i * 0.04 });
    }
    souffle({ duree: 0.6, force: 0.12, coupure: 5200 });
}

export function victoire() {
    if (!actif) return;
    [0, 2, 4, 7].forEach((rang, i) => {
        note({ hauteur: degre(rang), duree: 0.45, forme: 'triangle', force: 0.18, retard: i * 0.1 });
    });
}

// La chute garde ses deux premiers intervalles ; seul le dernier degré monte,
// parce que lui seul tombait sous le plancher (294 Hz) et amputait la fin.
export function echec() {
    if (!actif) return;
    [5, 3, 2].forEach((rang, i) => {
        note({ hauteur: degre(rang) / 2, duree: 0.4, forme: 'sine', force: 0.16, retard: i * 0.13 });
    });
}
