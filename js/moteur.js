// Les règles de Diamants, sans une ligne de DOM.
//
// Le moteur ne sait rien de l'écran : il tient une grille, accepte un échange,
// et raconte ce qui s'est passé sous forme d'étapes. Le rendu se contente de
// rejouer ce récit. C'est ce qui permet de tester tout le jeu dans Node.
//
// Le point de vigilance de tout match-3 quotidien est le remplissage. Si les
// nouvelles gemmes sortaient d'un flux consommé au fil des coups, deux joueurs
// partis de la même graine divergeraient au troisième mouvement et leurs scores
// ne voudraient plus rien dire. Ici la gemme qui tombe est une fonction pure de
// sa colonne et de son rang d'arrivée : peu importe l'ordre des coups, la
// septième gemme de la colonne 3 est la même pour tout le monde.

import { hacher, creerAlea } from './alea.js';

export const GEMMES = ['rubis', 'emeraude', 'saphir', 'amethyste', 'topaze', 'quartz', 'onyx'];

export const ECLAT_H = 'eclat-h';
export const ECLAT_V = 'eclat-v';
export const BOMBE = 'bombe';
export const DIAMANT = 'diamant';

const POINTS_GEMME = 60;
const POINTS_GANGUE = 120;

const gemme = (type, special = null) => ({ type, special });
const bloc = (couches) => ({ gangue: couches });

export const estGemme = (cel) => Boolean(cel) && cel.gangue === undefined;
export const estGangue = (cel) => Boolean(cel) && cel.gangue > 0;
export const estDiamant = (cel) => estGemme(cel) && cel.special === DIAMANT;

const colonneDe = (partie, i) => i % partie.colonnes;
const ligneDe = (partie, i) => Math.floor(i / partie.colonnes);
const indexDe = (partie, c, r) => r * partie.colonnes + c;

function voisins(partie, i) {
    const c = colonneDe(partie, i);
    const r = ligneDe(partie, i);
    const liste = [];
    if (c > 0) liste.push(i - 1);
    if (c < partie.colonnes - 1) liste.push(i + 1);
    if (r > 0) liste.push(i - partie.colonnes);
    if (r < partie.lignes - 1) liste.push(i + partie.colonnes);
    return liste;
}

export function adjacentes(partie, a, b) {
    return voisins(partie, a).includes(b);
}

// --------------------------------------------------------------- Naissance

export function creerPartie(options = {}) {
    const {
        graine = 'libre',
        colonnes = 8,
        lignes = 8,
        couleurs = 6,
        coupsMax = null,
        gangues = 0,
    } = options;

    const partie = {
        graine: String(graine),
        colonnes,
        lignes,
        couleurs: Math.min(Math.max(couleurs, 4), GEMMES.length),
        cases: new Array(colonnes * lignes).fill(null),
        coupsMax,
        coupsJoues: 0,
        score: 0,
        cascadeMax: 0,
        recoltes: {},
        ganguesBrisees: 0,
        ganguesPosees: 0,
        speciales: 0,
        remplissages: new Array(colonnes).fill(0),
        melanges: 0,
        termine: false,
    };
    for (const type of GEMMES.slice(0, partie.couleurs)) partie.recoltes[type] = 0;

    poserGangues(partie, gangues);
    for (let i = 0; i < partie.cases.length; i += 1) {
        if (partie.cases[i]) continue;
        partie.cases[i] = gemme(typeCalme(partie, colonneDe(partie, i), ligneDe(partie, i), 1));
    }
    garantirCoup(partie);
    return partie;
}

// La gangue ne descend jamais sur la première ligne : elle y boucherait la
// source de la colonne, et tout ce qui est dessous mourrait de faim. Deux blocs
// par ligne au maximum, pour que les gemmes trouvent toujours un passage.
function poserGangues(partie, nombre) {
    if (nombre <= 0) return;
    const alea = creerAlea(`${partie.graine}|gangue`);
    const parLigne = new Array(partie.lignes).fill(0);
    for (let essai = 0; essai < nombre * 40 && partie.ganguesPosees < nombre; essai += 1) {
        const c = alea.int(0, partie.colonnes - 1);
        const r = alea.int(1, partie.lignes - 1);
        const i = indexDe(partie, c, r);
        if (partie.cases[i] || parLigne[r] >= 2) continue;
        partie.cases[i] = bloc(alea() < 0.3 ? 2 : 1);
        parLigne[r] += 1;
        partie.ganguesPosees += 1;
    }
}

// Une couleur qui ne complète pas d'alignement avec ce qui est déjà posé : on
// veut une grille de départ calme, où rien n'explose avant le premier coup.
function typeCalme(partie, c, r, sel) {
    let dernier = GEMMES[0];
    for (let essai = 0; essai < 16; essai += 1) {
        const type = GEMMES[hacher(partie.graine, sel, c, r, essai) % partie.couleurs];
        dernier = type;
        if (!prolongeUneSerie(partie, c, r, type)) return type;
    }
    return dernier;
}

function prolongeUneSerie(partie, c, r, type) {
    const memeCouleur = (cc, rr) => {
        if (cc < 0 || rr < 0) return false;
        const cel = partie.cases[indexDe(partie, cc, rr)];
        return estGemme(cel) && cel.type === type;
    };
    if (memeCouleur(c - 1, r) && memeCouleur(c - 2, r)) return true;
    if (memeCouleur(c, r - 1) && memeCouleur(c, r - 2)) return true;
    return false;
}

// Le cœur de l'équité : cette gemme-là, à cette place-là, pour tout le monde.
function gemmeDeRemplissage(partie, colonne) {
    const rang = partie.remplissages[colonne];
    partie.remplissages[colonne] += 1;
    return gemme(GEMMES[hacher(partie.graine, 2, colonne, rang) % partie.couleurs]);
}

// -------------------------------------------------------------- Alignements

function couleurDe(partie, i) {
    const cel = partie.cases[i];
    return estGemme(cel) ? cel.type : null;
}

function series(partie) {
    const { colonnes, lignes } = partie;
    const trouvees = [];

    const balayer = (longueur, indexAu, orientation) => {
        let debut = 0;
        for (let k = 1; k <= longueur; k += 1) {
            const type = couleurDe(partie, indexAu(debut));
            const meme = k < longueur && type !== null && couleurDe(partie, indexAu(k)) === type;
            if (meme) continue;
            if (k - debut >= 3 && type !== null) {
                const cellules = [];
                for (let m = debut; m < k; m += 1) cellules.push(indexAu(m));
                trouvees.push({ orientation, type, cellules });
            }
            debut = k;
        }
    };

    for (let r = 0; r < lignes; r += 1) balayer(colonnes, (c) => indexDe(partie, c, r), 'h');
    for (let c = 0; c < colonnes; c += 1) balayer(lignes, (r) => indexDe(partie, c, r), 'v');
    return trouvees;
}

// Deux séries qui se croisent forment un seul groupe : c'est ce croisement qui
// distingue un L ou un T d'une simple ligne, et donne la bombe.
function groupes(partie) {
    const resultat = [];
    for (const serie of series(partie)) {
        const cellules = new Set(serie.cellules);
        let membres = [serie];
        for (let k = resultat.length - 1; k >= 0; k -= 1) {
            const groupe = resultat[k];
            if (groupe.type !== serie.type) continue;
            if (!groupe.cellules.some((i) => cellules.has(i))) continue;
            membres = membres.concat(groupe.series);
            for (const i of groupe.cellules) cellules.add(i);
            resultat.splice(k, 1);
        }
        resultat.push({ type: serie.type, series: membres, cellules: [...cellules] });
    }
    return resultat;
}

export function alignementsPresents(partie) {
    return groupes(partie).length > 0;
}

// -------------------------------------------------------------- Récompenses

function recompense(partie, groupe, origines) {
    const plusLongue = groupe.series.reduce((a, s) => Math.max(a, s.cellules.length), 0);
    const horizontale = groupe.series.find((s) => s.orientation === 'h');
    const verticale = groupe.series.find((s) => s.orientation === 'v');

    let special = null;
    if (plusLongue >= 5) special = DIAMANT;
    else if (horizontale && verticale) special = BOMBE;
    else if (plusLongue === 4) special = horizontale ? ECLAT_H : ECLAT_V;
    if (!special) return null;

    return {
        index: ancrage(groupe, origines, horizontale, verticale),
        special,
        type: special === DIAMANT ? null : groupe.type,
    };
}

// La gemme spéciale naît sous le doigt du joueur quand c'est possible : c'est
// là qu'il la cherche des yeux. Sinon au croisement, sinon au milieu.
function ancrage(groupe, origines, horizontale, verticale) {
    const sousLeDoigt = origines.find((i) => groupe.cellules.includes(i));
    if (sousLeDoigt !== undefined) return sousLeDoigt;
    if (horizontale && verticale) {
        const croisement = horizontale.cellules.find((i) => verticale.cellules.includes(i));
        if (croisement !== undefined) return croisement;
    }
    const longue = groupe.series.reduce((a, s) => (s.cellules.length > a.cellules.length ? s : a));
    return longue.cellules[Math.floor(longue.cellules.length / 2)];
}

function zoneSpeciale(partie, i, cel) {
    const { colonnes, lignes } = partie;
    const c = colonneDe(partie, i);
    const r = ligneDe(partie, i);
    const zone = [];
    if (cel.special === ECLAT_H) {
        for (let cc = 0; cc < colonnes; cc += 1) zone.push(indexDe(partie, cc, r));
    } else if (cel.special === ECLAT_V) {
        for (let rr = 0; rr < lignes; rr += 1) zone.push(indexDe(partie, c, rr));
    } else if (cel.special === BOMBE) {
        for (let rr = r - 1; rr <= r + 1; rr += 1) {
            for (let cc = c - 1; cc <= c + 1; cc += 1) {
                if (cc < 0 || cc >= colonnes || rr < 0 || rr >= lignes) continue;
                zone.push(indexDe(partie, cc, rr));
            }
        }
    } else if (cel.special === DIAMANT) {
        // Un diamant pris dans une explosion emporte la couleur la plus
        // répandue : le hasard n'a pas son mot à dire, le plateau décide.
        const cible = couleurDominante(partie);
        for (let k = 0; k < partie.cases.length; k += 1) {
            if (couleurDe(partie, k) === cible) zone.push(k);
        }
    }
    return zone;
}

function couleurDominante(partie) {
    const comptes = new Map();
    for (let i = 0; i < partie.cases.length; i += 1) {
        const type = couleurDe(partie, i);
        if (type) comptes.set(type, (comptes.get(type) ?? 0) + 1);
    }
    let meilleure = null;
    let record = -1;
    for (const type of GEMMES) {
        const compte = comptes.get(type) ?? 0;
        if (compte > record) {
            record = compte;
            meilleure = type;
        }
    }
    return meilleure;
}

// Une spéciale effacée en déclenche d'autres, qui en déclenchent d'autres.
function propager(partie, aEffacer, aBriser) {
    const file = [...aEffacer];
    while (file.length) {
        const i = file.pop();
        const cel = partie.cases[i];
        if (!estGemme(cel) || !cel.special) continue;
        for (const j of zoneSpeciale(partie, i, cel)) {
            const voisine = partie.cases[j];
            if (estGangue(voisine)) {
                aBriser.add(j);
            } else if (estGemme(voisine) && !aEffacer.has(j)) {
                aEffacer.add(j);
                file.push(j);
            }
        }
    }
}

// ------------------------------------------------------------------- Chute

function tomber(partie) {
    const { colonnes, lignes, cases } = partie;
    const source = new Array(cases.length);
    for (let i = 0; i < cases.length; i += 1) {
        if (estGemme(cases[i])) source[i] = { c: colonneDe(partie, i), r: ligneDe(partie, i) };
    }
    // Rangs virtuels au-dessus du plateau : de quoi faire entrer les nouvelles
    // gemmes par le haut de l'écran, dans l'ordre où elles arrivent.
    const virtuel = new Array(colonnes).fill(-1);

    const deposer = (i) => {
        const c = colonneDe(partie, i);
        cases[i] = gemmeDeRemplissage(partie, c);
        source[i] = { c, r: virtuel[c] };
        virtuel[c] -= 1;
    };

    for (let garde = 0; garde < cases.length * 4 + 64; garde += 1) {
        let bouge = false;

        for (let r = lignes - 2; r >= 0; r -= 1) {
            for (let c = 0; c < colonnes; c += 1) {
                const i = indexDe(partie, c, r);
                const dessous = i + colonnes;
                if (!estGemme(cases[i]) || cases[dessous] !== null) continue;
                cases[dessous] = cases[i];
                source[dessous] = source[i];
                cases[i] = null;
                source[i] = undefined;
                bouge = true;
            }
        }

        // Contourner la gangue par la diagonale, sans quoi tout ce qui vit sous
        // un bloc resterait à jamais dans un trou.
        for (let r = lignes - 2; r >= 0; r -= 1) {
            for (let c = 0; c < colonnes; c += 1) {
                const i = indexDe(partie, c, r);
                if (!estGemme(cases[i]) || !estGangue(cases[i + colonnes])) continue;
                for (const pas of [-1, 1]) {
                    const cc = c + pas;
                    if (cc < 0 || cc >= colonnes) continue;
                    const cible = indexDe(partie, cc, r + 1);
                    if (cases[cible] !== null) continue;
                    cases[cible] = cases[i];
                    source[cible] = source[i];
                    cases[i] = null;
                    source[i] = undefined;
                    bouge = true;
                    break;
                }
            }
        }

        for (let c = 0; c < colonnes; c += 1) {
            if (cases[c] !== null) continue;
            deposer(c);
            bouge = true;
        }

        if (!bouge) break;
    }

    // Filet de sécurité : une poche complètement close ne se remplit pas par
    // gravité. Le plateau doit rester plein, quoi qu'il arrive.
    for (let i = 0; i < cases.length; i += 1) {
        if (cases[i] === null) deposer(i);
    }

    const mouvements = [];
    for (let i = 0; i < cases.length; i += 1) {
        const depart = source[i];
        if (!depart) continue;
        if (depart.c === colonneDe(partie, i) && depart.r === ligneDe(partie, i)) continue;
        mouvements.push({ vers: i, colonne: depart.c, ligne: depart.r });
    }
    return mouvements;
}

// ---------------------------------------------------------------- Résolution

function appliquerEffacement(partie, aEffacer, cascade, creations = []) {
    const aBriser = new Set();
    propager(partie, aEffacer, aBriser);
    for (const creation of creations) aEffacer.delete(creation.index);
    for (const i of aEffacer) {
        for (const j of voisins(partie, i)) if (estGangue(partie.cases[j])) aBriser.add(j);
    }

    const effacees = [];
    for (const i of aEffacer) {
        const cel = partie.cases[i];
        effacees.push({ index: i, type: cel.type, special: cel.special });
        if (cel.type) partie.recoltes[cel.type] = (partie.recoltes[cel.type] ?? 0) + 1;
        partie.cases[i] = null;
    }

    const brisees = [];
    for (const i of aBriser) {
        const cel = partie.cases[i];
        cel.gangue -= 1;
        const detruite = cel.gangue <= 0;
        if (detruite) {
            partie.ganguesBrisees += 1;
            partie.cases[i] = null;
        }
        brisees.push({ index: i, couches: detruite ? 0 : cel.gangue });
    }

    for (const creation of creations) {
        partie.cases[creation.index] = gemme(creation.type, creation.special);
        partie.speciales += 1;
    }

    const points = POINTS_GEMME * effacees.length * cascade + POINTS_GANGUE * brisees.length;
    partie.score += points;
    partie.cascadeMax = Math.max(partie.cascadeMax, cascade);

    const mouvements = tomber(partie);
    // L'état complet voyage avec l'étape : le rendu n'a jamais à rejouer les
    // règles pour savoir quoi afficher, il recopie ce qu'on lui donne.
    return { cascade, effacees, brisees, creations, points, mouvements, etat: copieCases(partie) };
}

function resoudre(partie, origines, etapes = [], depart = 0) {
    let cascade = depart;
    for (let garde = 0; garde < 200; garde += 1) {
        const trouves = groupes(partie);
        if (!trouves.length) break;
        cascade += 1;
        const aEffacer = new Set();
        for (const groupe of trouves) for (const i of groupe.cellules) aEffacer.add(i);
        const creations = trouves
            .map((groupe) => recompense(partie, groupe, cascade === 1 ? origines : []))
            .filter(Boolean);
        etapes.push(appliquerEffacement(partie, aEffacer, cascade, creations));
    }
    return { cascade, etapes };
}

// ------------------------------------------------------------------- Coups

function echanger(partie, a, b) {
    const garde = partie.cases[a];
    partie.cases[a] = partie.cases[b];
    partie.cases[b] = garde;
}

export function coupPossible(partie, a, b) {
    if (!adjacentes(partie, a, b)) return false;
    if (!estGemme(partie.cases[a]) || !estGemme(partie.cases[b])) return false;
    if (estDiamant(partie.cases[a]) || estDiamant(partie.cases[b])) return true;
    echanger(partie, a, b);
    const valide = alignementsPresents(partie);
    echanger(partie, a, b);
    return valide;
}

export function existeCoup(partie) {
    const { colonnes, lignes } = partie;
    for (let r = 0; r < lignes; r += 1) {
        for (let c = 0; c < colonnes; c += 1) {
            const i = indexDe(partie, c, r);
            if (!estGemme(partie.cases[i])) continue;
            if (c < colonnes - 1 && coupPossible(partie, i, i + 1)) return true;
            if (r < lignes - 1 && coupPossible(partie, i, i + colonnes)) return true;
        }
    }
    return false;
}

// Plus aucun coup : on rebat les gemmes en place, sans en créer ni en perdre.
function melanger(partie) {
    partie.melanges += 1;
    const alea = creerAlea(`${partie.graine}|melange|${partie.melanges}`);
    const places = [];
    const contenu = [];
    for (let i = 0; i < partie.cases.length; i += 1) {
        if (!estGemme(partie.cases[i])) continue;
        places.push(i);
        contenu.push(partie.cases[i]);
    }
    for (let essai = 0; essai < 40; essai += 1) {
        const tirage = alea.melanger(contenu);
        places.forEach((p, k) => { partie.cases[p] = tirage[k]; });
        if (!alignementsPresents(partie) && existeCoup(partie)) return true;
    }
    // Rien à faire de ce tas : on redistribue des couleurs neuves.
    for (const p of places) partie.cases[p] = null;
    for (const p of places) {
        partie.cases[p] = gemme(typeCalme(partie, colonneDe(partie, p), ligneDe(partie, p), 100 + partie.melanges));
    }
    return existeCoup(partie);
}

function garantirCoup(partie) {
    let melanges = 0;
    while (!existeCoup(partie) && melanges < 8) {
        melanger(partie);
        melanges += 1;
    }
    return melanges;
}

export function jouer(partie, a, b) {
    if (partie.termine) return { valide: false, raison: 'terminee' };
    if (!adjacentes(partie, a, b)) return { valide: false, raison: 'eloignees' };
    const gemmeA = partie.cases[a];
    const gemmeB = partie.cases[b];
    if (!estGemme(gemmeA) || !estGemme(gemmeB)) return { valide: false, raison: 'bloquee' };

    const etapes = [];
    let cascade = 0;

    if (estDiamant(gemmeA) || estDiamant(gemmeB)) {
        echanger(partie, a, b);
        partie.coupsJoues += 1;
        cascade = 1;
        etapes.push(appliquerEffacement(partie, moissonDuDiamant(partie, a, b), 1));
    } else {
        echanger(partie, a, b);
        if (!alignementsPresents(partie)) {
            echanger(partie, a, b);
            return { valide: false, raison: 'sansEffet' };
        }
        partie.coupsJoues += 1;
    }

    const bilan = resoudre(partie, [a, b], etapes, cascade);
    const melanges = garantirCoup(partie);
    if (partie.coupsMax !== null && partie.coupsJoues >= partie.coupsMax) partie.termine = true;

    return { valide: true, echange: [a, b], etapes: bilan.etapes, cascade: bilan.cascade, melanges };
}

// Le diamant s'échange avec n'importe quoi et emporte toute la couleur qu'il
// touche. Deux diamants l'un contre l'autre vident le plateau.
function moissonDuDiamant(partie, a, b) {
    const gemmeA = partie.cases[a];
    const gemmeB = partie.cases[b];
    const deuxDiamants = estDiamant(gemmeA) && estDiamant(gemmeB);
    const cible = deuxDiamants ? null : (estDiamant(gemmeA) ? gemmeB.type : gemmeA.type);
    const aEffacer = new Set([a, b]);
    for (let i = 0; i < partie.cases.length; i += 1) {
        if (!estGemme(partie.cases[i])) continue;
        if (cible === null || partie.cases[i].type === cible) aEffacer.add(i);
    }
    return aEffacer;
}

// ------------------------------------------------------------------ Lecture

export function copieCases(partie) {
    return partie.cases.map((cel) => (cel ? { ...cel } : null));
}

export function restaurerCases(partie, cases) {
    partie.cases = cases.map((cel) => (cel ? { ...cel } : null));
}
