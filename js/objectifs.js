// Le défi du jour : une grille, un budget de coups, des commandes à remplir.
//
// Tout est déduit de la date, rien n'est stocké : le 20 août 2026 donne le même
// plateau et les mêmes commandes à qui l'ouvre, aujourd'hui ou dans six mois.

import { creerAlea } from './alea.js';
import { GEMMES } from './moteur.js';

export const COUPS_DU_JOUR = 22;
export const GANGUES_DU_JOUR = 6;
export const COULEURS_DU_JOUR = 6;

export function cleDuJour(date = new Date()) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
}

export function cleValide(cle) {
    return typeof cle === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cle);
}

export function dateLisible(cle) {
    const [annee, mois, jour] = cle.split('-');
    return `${jour}/${mois}/${annee}`;
}

export function defiDuJour(cle) {
    const graine = `jour-${cle}`;
    const alea = creerAlea(`${graine}|defi`);
    const palette = alea.melanger(GEMMES.slice(0, COULEURS_DU_JOUR));

    const objectifs = [
        { genre: 'recolte', type: palette[0], quantite: alea.int(17, 23) },
        { genre: 'recolte', type: palette[1], quantite: alea.int(12, 17) },
        // Six blocs sur le plateau, trois à cinq à faire tomber : il reste de
        // quoi se tromper de coin sans perdre la journée.
        { genre: 'gangue', quantite: alea.int(3, 5) },
    ];
    // Une commande sur trois demande de fabriquer des gemmes taillées : ces
    // jours-là, aligner trois pierres au hasard ne suffit plus.
    if (alea() < 0.34) objectifs.push({ genre: 'speciale', quantite: alea.int(2, 3) });

    return {
        cle,
        graine,
        colonnes: 8,
        lignes: 8,
        couleurs: COULEURS_DU_JOUR,
        coupsMax: COUPS_DU_JOUR,
        gangues: GANGUES_DU_JOUR,
        objectifs,
    };
}

export function avancement(partie, objectif) {
    if (objectif.genre === 'recolte') return partie.recoltes[objectif.type] ?? 0;
    if (objectif.genre === 'gangue') return partie.ganguesBrisees;
    return partie.speciales;
}

export function objectifRempli(partie, objectif) {
    return avancement(partie, objectif) >= objectif.quantite;
}

export function defiReussi(partie, defi) {
    return defi.objectifs.every((objectif) => objectifRempli(partie, objectif));
}

export function libelle(objectif) {
    if (objectif.genre === 'recolte') return `${objectif.quantite} ${NOMS[objectif.type]}`;
    if (objectif.genre === 'gangue') return `${objectif.quantite} gangues brisées`;
    return `${objectif.quantite} gemmes taillées`;
}

export const NOMS = {
    rubis: 'rubis',
    emeraude: 'émeraudes',
    saphir: 'saphirs',
    amethyste: 'améthystes',
    topaze: 'topazes',
    quartz: 'quartz',
    onyx: 'onyx',
};
