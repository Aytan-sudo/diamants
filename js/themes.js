// Ambiances et jeux de pierres : deux réglages qui ne se mélangent pas.

export const AMBIANCES = [
    { cle: 'ecrin', nom: 'Écrin', apercu: '#b4762a' },
    { cle: 'ardoise', nom: 'Ardoise', apercu: '#4d7ba3' },
    { cle: 'sauge', nom: 'Sauge', apercu: '#5d8447' },
    { cle: 'nuit', nom: 'Nuit', apercu: '#1b212b' },
    { cle: 'crepuscule', nom: 'Crépuscule', apercu: '#b989d8' },
];

export const JEUX_DE_PIERRES = [
    { cle: 'joaillerie', nom: 'Joaillerie', apercu: ['#d8384a', '#2f9e6b', '#3d7fd0'] },
    { cle: 'mineraux', nom: 'Minéraux', apercu: ['#c05543', '#5c9450', '#4c7a9b'] },
    { cle: 'neon', nom: 'Néon', apercu: ['#ff3b6b', '#12d18a', '#2ea8ff'] },
    { cle: 'contraste', nom: 'Contraste', apercu: ['#e01f2d', '#00875a', '#1050c8'] },
];

const COULEUR_DE_BARRE = {
    ecrin: '#f6f1e8',
    ardoise: '#eceff3',
    sauge: '#eff2e9',
    nuit: '#12161d',
    crepuscule: '#17131f',
};

export const REGLAGES_PAR_DEFAUT = {
    ambiance: 'ecrin',
    pierres: 'joaillerie',
    difficulte: 'normal',
    symboles: 'non',
    mouvement: 'plein',
};

export function appliquer(reglages) {
    const racine = document.documentElement;
    racine.dataset.ambiance = reglages.ambiance;
    racine.dataset.pierres = reglages.pierres;
    racine.dataset.symboles = reglages.symboles;
    racine.dataset.mouvement = reglages.mouvement;
    const barre = document.querySelector('meta[name="theme-color"]');
    if (barre) barre.setAttribute('content', COULEUR_DE_BARRE[reglages.ambiance] ?? '#f6f1e8');
}
