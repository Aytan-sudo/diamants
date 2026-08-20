// Le stockage local, avec un plan de secours.
//
// Navigation privée, quota plein, réglages verrouillés : localStorage sait
// refuser. Le jeu doit rester jouable dans ce cas, il perdra seulement la
// mémoire en fermant l'onglet.

const PREFIXE = 'diamants:';
const memoire = new Map();
let coffre = null;

function obtenirCoffre() {
    if (coffre) return coffre;
    try {
        const sonde = `${PREFIXE}sonde`;
        localStorage.setItem(sonde, '1');
        localStorage.removeItem(sonde);
        coffre = localStorage;
    } catch {
        coffre = {
            getItem: (cle) => memoire.get(cle) ?? null,
            setItem: (cle, valeur) => memoire.set(cle, valeur),
            removeItem: (cle) => memoire.delete(cle),
        };
    }
    return coffre;
}

export function lire(cle, defaut = null) {
    try {
        const brut = obtenirCoffre().getItem(PREFIXE + cle);
        return brut === null ? defaut : JSON.parse(brut);
    } catch {
        return defaut;
    }
}

export function ecrire(cle, valeur) {
    try {
        obtenirCoffre().setItem(PREFIXE + cle, JSON.stringify(valeur));
    } catch {
        // Tant pis pour la mémoire : la partie en cours, elle, tient debout.
    }
}

export function oublier(cle) {
    try {
        obtenirCoffre().removeItem(PREFIXE + cle);
    } catch {
        // Rien à faire.
    }
}
