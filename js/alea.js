// Hasard reproductible.
//
// Tout ce que ce jeu tire au sort doit pouvoir l'être une seconde fois à
// l'identique : sans ça le puzzle du jour n'existe pas, et deux joueurs qui
// comparent leurs scores ne parlent pas de la même grille.
//
// Deux outils, deux usages. `hacher` répond à une question ponctuelle — « quelle
// gemme tombe en septième position dans la colonne 3 ? » — sans dépendre de
// l'ordre des appels : c'est ce qui rend le remplissage équitable, quels que
// soient les coups joués. `creerAlea` donne un flux classique, pour les tirages
// faits une fois pour toutes au montage de la grille.
//
// Rien de cryptographique ici, et ce n'est pas le sujet.

function hacherTexte(texte) {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i += 1) {
        h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
    }
    return h >>> 0;
}

const memoire = new Map();

function graineEntiere(graine) {
    const cle = String(graine);
    let valeur = memoire.get(cle);
    if (valeur === undefined) {
        valeur = hacherTexte(cle);
        if (memoire.size > 64) memoire.clear();
        memoire.set(cle, valeur);
    }
    return valeur;
}

// Fonction pure : mêmes arguments, même entier, pour toujours.
export function hacher(graine, ...entiers) {
    let h = graineEntiere(graine);
    for (const n of entiers) {
        h = Math.imul(h ^ ((n | 0) + 0x9e3779b9), 2654435761);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
}

export function creerAlea(graine) {
    let etat = graineEntiere(graine) || 1;

    const alea = () => {
        etat = (etat + 0x6d2b79f5) >>> 0;
        let t = etat;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    alea.int = (min, max) => min + Math.floor(alea() * (max - min + 1));
    alea.piocher = (items) => items[Math.floor(alea() * items.length)];
    alea.melanger = (items) => {
        const copie = [...items];
        for (let i = copie.length - 1; i > 0; i -= 1) {
            const j = Math.floor(alea() * (i + 1));
            [copie[i], copie[j]] = [copie[j], copie[i]];
        }
        return copie;
    };

    return alea;
}

export function graineAleatoire() {
    if (globalThis.crypto?.getRandomValues) {
        const valeurs = new Uint32Array(2);
        globalThis.crypto.getRandomValues(valeurs);
        return `${valeurs[0].toString(36)}-${valeurs[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
