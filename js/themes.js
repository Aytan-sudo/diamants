// Ambiances et jeux de pierres : deux réglages qui ne se mélangent pas.

export const AMBIANCES = [
    { cle: 'nebuleuse', nom: 'Nébuleuse', fond: '#0a0724', accent: '#3ee8ff' },
    { cle: 'ecrin', nom: 'Écrin', fond: '#12102a', accent: '#e8b14a' },
    { cle: 'onyx', nom: 'Onyx', fond: '#12151b', accent: '#cfd8e6' },
    { cle: 'pourpre', nom: 'Pourpre', fond: '#24101c', accent: '#f0a6a0' },
    { cle: 'malachite', nom: 'Malachite', fond: '#0e2019', accent: '#f0c96a' },
    { cle: 'vitrine', nom: 'Vitrine', fond: '#f2eee7', accent: '#a9752a' },
];

export const JEUX_DE_PIERRES = [
    { cle: 'arcade', nom: 'Arcade', apercu: ['#ff1e3c', '#1ee65a', '#2f6bff'] },
    { cle: 'joaillerie', nom: 'Joaillerie', apercu: ['#ff4762', '#27dd8c', '#48a6ff'] },
    { cle: 'mineraux', nom: 'Minéraux', apercu: ['#e0604f', '#6cb75d', '#5d93bb'] },
    { cle: 'neon', nom: 'Néon', apercu: ['#ff2d64', '#00ffa3', '#29c8ff'] },
    { cle: 'contraste', nom: 'Contraste', apercu: ['#ff1f36', '#00c46a', '#2f7bff'] },
];

const COULEUR_DE_BARRE = {
    nebuleuse: '#060512',
    ecrin: '#0c0a18',
    onyx: '#08090c',
    pourpre: '#14060e',
    malachite: '#05130f',
    vitrine: '#f2eee7',
};

export const REGLAGES_PAR_DEFAUT = {
    ambiance: 'nebuleuse',
    pierres: 'arcade',
    difficulte: 'normal',
    symboles: 'non',
    mouvement: 'plein',
    son: 'oui',
    vibration: 'oui',
};

export function appliquer(reglages) {
    const racine = document.documentElement;
    racine.dataset.ambiance = reglages.ambiance;
    racine.dataset.pierres = reglages.pierres;
    racine.dataset.symboles = reglages.symboles;
    racine.dataset.mouvement = reglages.mouvement;
    const barre = document.querySelector('meta[name="theme-color"]');
    if (barre) barre.setAttribute('content', COULEUR_DE_BARRE[reglages.ambiance] ?? '#060512');
}
