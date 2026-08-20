// L'assemblage : un mode, une grille, un joueur.
//
// Le fil est toujours le même — le joueur désigne deux pierres, le moteur
// tranche, le rendu montre, le tableau de bord suit. Aucune règle du jeu ne
// vit ici ; app.js décide seulement quand chaque module parle.

import { creerPartie, jouer, adjacentes } from './moteur.js';
import { creerRendu } from './rendu.js';
import {
    cleDuJour, cleValide, dateLisible, defiDuJour,
    avancement, objectifRempli, defiReussi, libelle, NOMS,
} from './objectifs.js';
import { texteDuJour, textePartieLibre, lienSms, lireFragment, emojiDe, URL_JEU } from './partage.js';
import { AMBIANCES, JEUX_DE_PIERRES, REGLAGES_PAR_DEFAUT, appliquer as appliquerThemes } from './themes.js';
import { lire, ecrire, oublier } from './storage.js';
import { graineAleatoire } from './alea.js';

const MODES = {
    jour: { nom: 'Défi du jour' },
    coups: { nom: 'Partie en 25 coups', coupsMax: 25 },
    chrono: { nom: 'Chrono 90 secondes', duree: 90 },
    zen: { nom: 'Partie zen' },
};

const DIFFICULTES = {
    facile: { nom: 'Facile', colonnes: 7, lignes: 7, couleurs: 5, gangues: 0 },
    normal: { nom: 'Normal', colonnes: 8, lignes: 8, couleurs: 6, gangues: 4 },
    corse: { nom: 'Corsé', colonnes: 8, lignes: 8, couleurs: 7, gangues: 8 },
};

const STATS_VIDES = {
    joues: 0, reussis: 0, serie: 0, record: 0,
    dernierJour: null, meilleurScore: 0, meilleureCascade: 0,
};

const el = (id) => document.getElementById(id);
const plateau = el('plateau');
const rendu = creerRendu(plateau);

let reglages = { ...REGLAGES_PAR_DEFAUT, ...(lire('reglages') ?? {}) };
let stats = { ...STATS_VIDES, ...(lire('stats') ?? {}) };
let mode = 'jour';
let defi = null;
let partie = null;
let coupsJoues = [];
let selection = null;
let occupe = false;
let curseur = 0;
let minuterie = null;
let tempsRestant = 0;

// ------------------------------------------------------------------ Réglages

function sobre() {
    if (reglages.mouvement === 'sobre') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function appliquerReglages() {
    appliquerThemes(reglages);
    rendu.reglerSobriete(sobre());
    ecrire('reglages', reglages);
}

function pastille(couleur) {
    const point = document.createElement('span');
    point.className = 'pastille';
    point.style.background = couleur;
    return point;
}

function echantillon(couleurs) {
    const boite = document.createElement('span');
    boite.className = 'echantillon';
    for (const couleur of couleurs) {
        const barre = document.createElement('i');
        barre.style.background = couleur;
        boite.append(barre);
    }
    return boite;
}

function monterChoix(conteneur, options, cleReglage, apres = () => {}) {
    conteneur.replaceChildren();
    for (const option of options) {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.setAttribute('role', 'radio');
        bouton.dataset.valeur = option.cle;
        if (option.decor) bouton.append(option.decor());
        bouton.append(document.createTextNode(option.nom));
        bouton.addEventListener('click', () => {
            reglages[cleReglage] = option.cle;
            appliquerReglages();
            marquerChoix(conteneur, reglages[cleReglage]);
            apres();
        });
        conteneur.append(bouton);
    }
    marquerChoix(conteneur, reglages[cleReglage]);
}

function marquerChoix(conteneur, valeur) {
    for (const bouton of conteneur.children) {
        bouton.setAttribute('aria-checked', String(bouton.dataset.valeur === valeur));
    }
}

// -------------------------------------------------------------------- Parties

function reglagesDeLaPartie() {
    if (mode === 'jour') return defi;
    const forme = DIFFICULTES[reglages.difficulte] ?? DIFFICULTES.normal;
    return {
        graine: graineAleatoire(),
        colonnes: forme.colonnes,
        lignes: forme.lignes,
        couleurs: forme.couleurs,
        gangues: forme.gangues,
        coupsMax: MODES[mode].coupsMax ?? null,
    };
}

function demarrer(options) {
    arreterChrono();
    partie = creerPartie(options);
    coupsJoues = [];
    selection = null;
    curseur = 0;
    rendu.monter(partie);
    majBord();
    majCommandes();
    if (mode === 'chrono') lancerChrono(MODES.chrono.duree);
    sauvegarder();
}

function nouvellePartie() {
    if (mode === 'jour') {
        defi = defiDuJour(defi?.cle ?? cleDuJour());
        demarrer(defi);
        return;
    }
    demarrer(reglagesDeLaPartie());
}

// Une partie tient en sa graine et la liste de ses coups : le moteur étant
// déterministe, la rejouer en silence suffit à la retrouver intacte.
function rejouer(options, coups) {
    partie = creerPartie(options);
    coupsJoues = [];
    for (const [a, b] of coups) {
        const resultat = jouer(partie, a, b);
        if (!resultat.valide) break;
        coupsJoues.push([a, b]);
    }
    rendu.monter(partie);
    majBord();
    majCommandes();
}

function sauvegarder() {
    if (!partie) return;
    if (mode === 'jour') {
        ecrire('jour', { cle: defi.cle, coups: coupsJoues, fini: partie.termine });
    } else if (mode === 'coups' || mode === 'zen') {
        ecrire('libre', {
            mode,
            coups: coupsJoues,
            options: {
                graine: partie.graine,
                colonnes: partie.colonnes,
                lignes: partie.lignes,
                couleurs: partie.couleurs,
                gangues: partie.ganguesPosees,
                coupsMax: partie.coupsMax,
            },
        });
    }
}

// --------------------------------------------------------------------- Chrono

function lancerChrono(secondes) {
    tempsRestant = secondes;
    majBord();
    minuterie = setInterval(() => {
        tempsRestant -= 1;
        majBord();
        if (tempsRestant <= 0) {
            arreterChrono();
            partie.termine = true;
            terminer();
        }
    }, 1000);
}

function arreterChrono() {
    if (minuterie) clearInterval(minuterie);
    minuterie = null;
}

// ---------------------------------------------------------- Tableau de bord

function majBord() {
    el('valeur-score').textContent = partie ? partie.score.toLocaleString('fr-FR') : '0';
    el('valeur-cascade').textContent = `×${partie?.cascadeMax ?? 0}`;
    const compteur = el('compteur-reste');
    if (mode === 'chrono') {
        el('titre-reste').textContent = 'Temps';
        el('valeur-reste').textContent = `${tempsRestant}s`;
        compteur.classList.toggle('presse', tempsRestant <= 10);
    } else if (partie?.coupsMax) {
        const reste = Math.max(partie.coupsMax - partie.coupsJoues, 0);
        el('titre-reste').textContent = 'Coups';
        el('valeur-reste').textContent = String(reste);
        compteur.classList.toggle('presse', reste <= 3);
    } else {
        el('titre-reste').textContent = 'Coups joués';
        el('valeur-reste').textContent = String(partie?.coupsJoues ?? 0);
        compteur.classList.remove('presse');
    }
}

function ligneCommande(objectif) {
    const item = document.createElement('li');
    item.className = 'commande';
    const fait = Math.min(avancement(partie, objectif), objectif.quantite);
    if (objectif.genre === 'recolte') {
        const jeton = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        jeton.setAttribute('class', 'jeton');
        jeton.setAttribute('viewBox', '0 0 100 100');
        jeton.style.color = `var(--g-${objectif.type})`;
        const usage = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        usage.setAttribute('href', `#forme-${objectif.type}`);
        jeton.append(usage);
        item.append(jeton);
    } else {
        const marque = document.createElement('span');
        marque.textContent = objectif.genre === 'gangue' ? '🪨' : '💎';
        item.append(marque);
    }
    const texte = document.createElement('span');
    texte.textContent = `${fait}/${objectif.quantite}`;
    item.append(texte);
    item.classList.toggle('faite', objectifRempli(partie, objectif));
    item.setAttribute('aria-label', `${libelle(objectif)} : ${fait} sur ${objectif.quantite}`);
    return item;
}

function majCommandes(cible = el('commandes')) {
    cible.replaceChildren();
    if (mode !== 'jour' || !defi) return;
    for (const objectif of defi.objectifs) cible.append(ligneCommande(objectif));
}

function annoncer(texte) {
    el('annonce').textContent = texte;
}

// ------------------------------------------------------------------- Le coup

async function tenter(a, b) {
    if (occupe || !partie || partie.termine) return;
    if (!adjacentes(partie, a, b)) {
        selection = b;
        rendu.selectionner(b);
        return;
    }
    occupe = true;
    const avant = partie.cases.map((cel) => (cel ? { ...cel } : null));
    const resultat = jouer(partie, a, b);
    selection = null;
    rendu.selectionner(null);

    if (!resultat.valide) {
        if (resultat.raison === 'sansEffet') {
            await rendu.animerRefus(a, b);
            annoncer("Cet échange n'aligne rien.");
        }
        occupe = false;
        return;
    }

    coupsJoues.push([a, b]);
    await rendu.jouerCoup(avant, resultat);
    if (resultat.melanges) {
        rendu.peindre(partie.cases);
        annoncer('Plus aucun coup possible : le plateau a été rebattu.');
    }
    majBord();
    majCommandes();
    sauvegarder();
    occupe = false;
    verifierFin();
}

function verifierFin() {
    if (!partie) return;
    if (mode === 'jour' && defiReussi(partie, defi)) {
        partie.termine = true;
    }
    if (partie.termine) terminer();
}

// -------------------------------------------------------------------- La fin

function terminer() {
    arreterChrono();
    sauvegarder();
    const reussi = mode === 'jour' ? defiReussi(partie, defi) : true;
    enregistrerStats(reussi);

    el('marque-fin').textContent = mode !== 'jour' ? '💎' : (reussi ? '💎' : '🪨');
    el('titre-fin').textContent = mode !== 'jour'
        ? 'Partie terminée'
        : (reussi ? 'Commandes honorées !' : 'Les commandes restent ouvertes');
    el('resultat-fin').textContent = mode === 'jour'
        ? `${partie.score.toLocaleString('fr-FR')} pts en ${partie.coupsJoues}/${defi.coupsMax} coups`
        : `${partie.score.toLocaleString('fr-FR')} pts · meilleure cascade ×${partie.cascadeMax}`;
    majCommandes(el('commandes-fin'));
    el('fin-rejouer').disabled = mode === 'jour';
    el('dialogue-fin').showModal();
}

function enregistrerStats(reussi) {
    stats.meilleurScore = Math.max(stats.meilleurScore, partie.score);
    stats.meilleureCascade = Math.max(stats.meilleureCascade, partie.cascadeMax);
    if (mode === 'jour' && stats.dernierJour !== defi.cle) {
        stats.joues += 1;
        if (reussi) {
            stats.reussis += 1;
            stats.serie = veilleDe(defi.cle) === stats.dernierJour ? stats.serie + 1 : 1;
            stats.record = Math.max(stats.record, stats.serie);
        } else {
            stats.serie = 0;
        }
        stats.dernierJour = defi.cle;
    }
    ecrire('stats', stats);
}

function veilleDe(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    const date = new Date(annee, mois - 1, jour - 1);
    return cleDuJour(date);
}

// ---------------------------------------------------------------- Le partage

function texteDePartage() {
    if (mode !== 'jour') return textePartieLibre(MODES[mode].nom, partie);
    if (!partie.termine) {
        return `Diamants — grille du ${dateLisible(defi.cle)}\n`
            + `${defi.objectifs.map((o) => `${emojiDe(o)} ${libelle(o)}`).join('\n')}\n`
            + `À toi de jouer :\n${URL_JEU}#jour=${defi.cle}`;
    }
    return texteDuJour(defi, partie, defiReussi(partie, defi));
}

function ouvrirPartage() {
    const texte = texteDePartage();
    el('apercu-partage').textContent = texte;
    el('partage-sms').href = lienSms(texte);
    el('partage-envoyer').hidden = !navigator.share;
    el('dialogue-partage').showModal();
}

// ----------------------------------------------------------------- Les modes

function changerMode(nouveau) {
    mode = nouveau;
    for (const bouton of document.querySelectorAll('.modes button')) {
        bouton.setAttribute('aria-pressed', String(bouton.dataset.mode === mode));
    }
    el('bouton-rejouer').textContent = mode === 'jour' ? 'Grille du jour' : 'Nouvelle grille';
    el('bouton-rejouer').disabled = mode === 'jour';
    el('bouton-rejouer').title = mode === 'jour' ? 'Le défi du jour ne se rejoue pas.' : '';
    ecrire('mode', mode);

    if (mode === 'jour') {
        reprendreLeJour(defi?.cle ?? cleDuJour());
    } else if (mode === 'chrono') {
        demarrer(reglagesDeLaPartie());
    } else {
        const garde = lire('libre');
        if (garde && garde.mode === mode) rejouer(garde.options, garde.coups);
        else demarrer(reglagesDeLaPartie());
    }
    majBadge();
}

function reprendreLeJour(cle) {
    defi = defiDuJour(cle);
    const garde = lire('jour');
    if (garde && garde.cle === cle && garde.coups?.length) {
        rejouer(defi, garde.coups);
        if (partie.termine || defiReussi(partie, defi)) {
            partie.termine = true;
            annoncer('Le défi du jour est déjà joué.');
        }
    } else {
        demarrer(defi);
    }
}

function majBadge() {
    const badge = el('badge');
    if (mode !== 'jour') {
        badge.hidden = true;
        return;
    }
    badge.hidden = false;
    const aujourdhui = defi.cle === cleDuJour();
    badge.textContent = aujourdhui
        ? `Grille du ${dateLisible(defi.cle)} — la même pour tout le monde`
        : `Grille du ${dateLisible(defi.cle)} (archive)`;
}

// ------------------------------------------------------------------- Entrées

let depart = null;

plateau.addEventListener('pointerdown', (evenement) => {
    const index = rendu.indexDe(evenement.target);
    if (index === null || occupe) return;
    depart = { index, x: evenement.clientX, y: evenement.clientY, glisse: false };
});

plateau.addEventListener('pointermove', (evenement) => {
    if (!depart || depart.glisse) return;
    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    if (Math.hypot(dx, dy) < 16) return;
    depart.glisse = true;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const colonne = depart.index % rendu.colonnes;
    let voisine = null;
    if (horizontal && dx > 0 && colonne < rendu.colonnes - 1) voisine = depart.index + 1;
    else if (horizontal && dx < 0 && colonne > 0) voisine = depart.index - 1;
    else if (!horizontal && dy > 0) voisine = depart.index + rendu.colonnes;
    else if (!horizontal && dy < 0) voisine = depart.index - rendu.colonnes;
    if (voisine !== null && voisine >= 0 && voisine < rendu.colonnes * rendu.lignes) {
        tenter(depart.index, voisine);
    }
});

plateau.addEventListener('pointerup', () => { setTimeout(() => { depart = null; }, 0); });
plateau.addEventListener('pointercancel', () => { depart = null; });

plateau.addEventListener('click', (evenement) => {
    const index = rendu.indexDe(evenement.target);
    if (index === null || occupe) return;
    if (depart?.glisse) return;
    curseur = index;
    if (selection === null) {
        selection = index;
        rendu.selectionner(index);
        return;
    }
    if (selection === index) {
        selection = null;
        rendu.selectionner(null);
        return;
    }
    tenter(selection, index);
});

plateau.addEventListener('keydown', (evenement) => {
    const pas = {
        ArrowLeft: -1, ArrowRight: 1,
        ArrowUp: -rendu.colonnes, ArrowDown: rendu.colonnes,
    }[evenement.key];
    if (pas === undefined) return;
    evenement.preventDefault();
    const colonne = curseur % rendu.colonnes;
    if (evenement.key === 'ArrowLeft' && colonne === 0) return;
    if (evenement.key === 'ArrowRight' && colonne === rendu.colonnes - 1) return;
    const cible = curseur + pas;
    if (cible < 0 || cible >= rendu.colonnes * rendu.lignes) return;
    curseur = cible;
    rendu.focaliser(cible);
});

// ------------------------------------------------------------------ Branchements

function brancher() {
    for (const bouton of document.querySelectorAll('.modes button')) {
        bouton.addEventListener('click', () => changerMode(bouton.dataset.mode));
    }
    el('bouton-rejouer').addEventListener('click', nouvellePartie);
    el('bouton-partager').addEventListener('click', ouvrirPartage);
    el('fin-partager').addEventListener('click', () => {
        el('dialogue-fin').close();
        ouvrirPartage();
    });
    el('fin-fermer').addEventListener('click', () => el('dialogue-fin').close());
    el('fin-rejouer').addEventListener('click', () => {
        el('dialogue-fin').close();
        nouvellePartie();
    });

    el('partage-fermer').addEventListener('click', () => el('dialogue-partage').close());
    el('partage-copier').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(texteDePartage());
            annoncer('Résultat copié.');
            el('partage-copier').textContent = 'Copié ✓';
            setTimeout(() => { el('partage-copier').textContent = 'Copier'; }, 1600);
        } catch {
            annoncer('Copie refusée par le navigateur.');
        }
    });
    el('partage-envoyer').addEventListener('click', async () => {
        try {
            await navigator.share({ text: texteDePartage() });
        } catch {
            // Partage annulé : rien à signaler.
        }
    });

    el('bouton-aide').addEventListener('click', () => el('dialogue-aide').showModal());
    el('aide-fermer').addEventListener('click', () => el('dialogue-aide').close());
    el('bouton-reglages').addEventListener('click', () => el('dialogue-reglages').showModal());
    el('reglages-fermer').addEventListener('click', () => el('dialogue-reglages').close());
    el('bouton-stats').addEventListener('click', () => {
        el('stat-reussis').textContent = String(stats.reussis);
        el('stat-joues').textContent = String(stats.joues);
        el('stat-serie').textContent = String(stats.serie);
        el('stat-record').textContent = String(stats.record);
        el('stat-score').textContent = stats.meilleurScore.toLocaleString('fr-FR');
        el('stat-cascade').textContent = `×${stats.meilleureCascade}`;
        el('dialogue-stats').showModal();
    });
    el('stats-fermer').addEventListener('click', () => el('dialogue-stats').close());
    el('stats-effacer').addEventListener('click', () => {
        stats = { ...STATS_VIDES };
        ecrire('stats', stats);
        oublier('jour');
        oublier('libre');
        el('dialogue-stats').close();
        annoncer('Statistiques effacées.');
    });

    monterChoix(el('choix-ambiance'), AMBIANCES.map((a) => ({
        ...a, decor: () => pastille(a.apercu),
    })), 'ambiance');
    monterChoix(el('choix-pierres'), JEUX_DE_PIERRES.map((j) => ({
        ...j, decor: () => echantillon(j.apercu),
    })), 'pierres');
    monterChoix(el('choix-difficulte'), Object.entries(DIFFICULTES).map(([cle, forme]) => ({
        cle, nom: forme.nom,
    })), 'difficulte', () => { if (mode !== 'jour') nouvellePartie(); });
    monterChoix(el('choix-symboles'), [
        { cle: 'non', nom: 'Sans' }, { cle: 'oui', nom: 'Avec' },
    ], 'symboles');
    monterChoix(el('choix-mouvement'), [
        { cle: 'plein', nom: 'Complètes' }, { cle: 'sobre', nom: 'Sobres' },
    ], 'mouvement');

    window.addEventListener('hashchange', demarrerDepuisLien);
}

function demarrerDepuisLien() {
    const lien = lireFragment(location.hash);
    if (lien?.genre === 'jour' && cleValide(lien.valeur)) {
        changerMode('jour');
        reprendreLeJour(lien.valeur);
        majBadge();
        return true;
    }
    if (lien?.genre === 'partie') {
        mode = 'zen';
        changerMode('zen');
        demarrer({ ...reglagesDeLaPartie(), graine: lien.valeur });
        return true;
    }
    return false;
}

appliquerReglages();
brancher();
if (!demarrerDepuisLien()) changerMode(lire('mode') ?? 'jour');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}
