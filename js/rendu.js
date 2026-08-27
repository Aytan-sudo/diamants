// Le rendu : il ne connaît aucune règle, il rejoue ce que le moteur raconte.
//
// Chaque étape d'un coup porte l'état complet du plateau et la liste des
// mouvements. Le rendu efface, repeint, puis fait glisser les pierres depuis
// l'endroit d'où elles viennent — y compris de plusieurs rangs au-dessus de
// l'écran pour celles qui entrent en jeu.
//
// C'est aussi ici que vivent les effets : éclats, ondes, scintillements,
// secousses. Le son en fait partie, parce qu'il obéit au même minutage que
// l'image : une explosion qui claque un dixième de seconde trop tard sonne
// comme une erreur.

import { estGangue, estDiamant, DIAMANT } from './moteur.js';
import * as son from './son.js';

const NOMS = {
    rubis: 'Rubis',
    emeraude: 'Émeraude',
    saphir: 'Saphir',
    amethyste: 'Améthyste',
    topaze: 'Topaze',
    quartz: 'Quartz',
    onyx: 'Onyx',
};

const NOMS_SPECIAUX = {
    'eclat-h': 'éclat horizontal',
    'eclat-v': 'éclat vertical',
    bombe: 'bombe',
    diamant: 'diamant',
};

const BRISURES_PAR_PIERRE = 7;
const BRISURES_MAX = 84;

// L'échelle de Bejeweled : ce qui récompense une cascade, ce n'est pas le
// nombre, c'est l'adjectif — et le fait qu'il monte. Le compte exact reste
// lisible dans le tableau de bord et dans la bulle de points.
const PROCLAMATIONS = ['Bien !', 'Excellent !', 'Superbe !', 'Prodigieux !', 'Irréel !'];
const proclamationDe = (cascade) => PROCLAMATIONS[Math.min(cascade - 2, PROCLAMATIONS.length - 1)];

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));
const teinteDe = (type) => (type ? `var(--g-${type})` : '#eaf2ff');

export function creerRendu(plateau) {
    let boutons = [];
    let colonnes = 8;
    let lignes = 8;
    let sobre = false;
    let couche = null;
    let horloge = null;

    function monter(partie) {
        colonnes = partie.colonnes;
        lignes = partie.lignes;
        plateau.style.setProperty('--colonnes', colonnes);
        plateau.style.setProperty('--lignes', lignes);
        plateau.replaceChildren();
        boutons = [];
        const grille = document.createElement('div');
        grille.className = 'grille';
        for (let i = 0; i < colonnes * lignes; i += 1) {
            const bouton = document.createElement('button');
            bouton.type = 'button';
            bouton.className = 'case';
            bouton.dataset.index = String(i);
            bouton.setAttribute('aria-pressed', 'false');
            bouton.tabIndex = i === 0 ? 0 : -1;
            grille.append(bouton);
            boutons.push(bouton);
        }
        plateau.append(grille);
        couche = document.createElement('div');
        couche.className = 'couche-effets';
        plateau.append(couche);
        peindre(partie.cases);
        lancerScintillements();
    }

    function description(cel, i) {
        const c = (i % colonnes) + 1;
        const r = Math.floor(i / colonnes) + 1;
        const place = `colonne ${c}, ligne ${r}`;
        if (estGangue(cel)) return `Gangue ${cel.gangue > 1 ? 'épaisse' : 'fendue'}, ${place}`;
        if (estDiamant(cel)) return `Diamant, ${place}`;
        const marque = cel.special ? ` ${NOMS_SPECIAUX[cel.special]}` : '';
        return `${NOMS[cel.type] ?? 'Pierre'}${marque}, ${place}`;
    }

    function contenu(cel) {
        if (estGangue(cel)) {
            const bloc = document.createElement('span');
            bloc.className = 'gangue';
            bloc.dataset.couches = String(cel.gangue);
            return bloc;
        }
        const pierre = document.createElement('span');
        pierre.className = 'pierre';
        const forme = cel.special === DIAMANT ? 'diamant' : cel.type;
        pierre.dataset.gemme = cel.special === DIAMANT ? 'quartz' : cel.type;
        if (cel.special) pierre.dataset.special = cel.special;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        const usage = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        usage.setAttribute('href', `#forme-${forme}`);
        svg.append(usage);
        pierre.append(svg);
        return pierre;
    }

    // Le pas d'une case à l'autre, mesuré sur la page : la grille est fluide,
    // aucune constante ne survivrait à un changement de largeur.
    function pas() {
        if (boutons.length < colonnes + 1) return { x: 0, y: 0 };
        return {
            x: boutons[1].offsetLeft - boutons[0].offsetLeft,
            y: boutons[colonnes].offsetTop - boutons[0].offsetTop,
        };
    }

    const centreDe = (i) => ({
        x: boutons[i].offsetLeft + boutons[i].offsetWidth / 2,
        y: boutons[i].offsetTop + boutons[i].offsetHeight / 2,
    });

    function peindre(etat, mouvements = []) {
        for (let i = 0; i < boutons.length; i += 1) {
            const cel = etat[i];
            const bouton = boutons[i];
            bouton.replaceChildren(contenu(cel));
            bouton.disabled = estGangue(cel);
            bouton.setAttribute('aria-pressed', 'false');
            bouton.setAttribute('aria-label', description(cel, i));
        }
        if (!mouvements.length || sobre) return;

        const { x, y } = pas();
        const glissantes = [];
        for (const mouvement of mouvements) {
            const pierre = boutons[mouvement.vers].firstChild;
            if (!pierre?.classList.contains('pierre')) continue;
            const dx = (mouvement.colonne - (mouvement.vers % colonnes)) * x;
            const dy = (mouvement.ligne - Math.floor(mouvement.vers / colonnes)) * y;
            pierre.classList.add('arrive');
            pierre.style.transform = `translate(${dx}px, ${dy}px)`;
            glissantes.push(pierre);
        }
        // Un tour de boucle d'affichage plus tard, on relâche : la transition
        // CSS ramène chaque pierre à sa place.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            for (const pierre of glissantes) {
                pierre.classList.remove('arrive');
                pierre.style.transform = '';
            }
        }));
    }

    function selectionner(index) {
        for (const bouton of boutons) bouton.setAttribute('aria-pressed', 'false');
        if (index !== null && boutons[index]) boutons[index].setAttribute('aria-pressed', 'true');
    }

    function focaliser(index) {
        for (const bouton of boutons) bouton.tabIndex = -1;
        const cible = boutons[index];
        if (!cible) return;
        cible.tabIndex = 0;
        cible.focus();
    }

    // ------------------------------------------------------------- Effets

    function poser(element, x, y, duree) {
        if (!couche) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        couche.append(element);
        setTimeout(() => element.remove(), duree);
    }

    function eclater(index, type) {
        const { x, y } = centreDe(index);
        const teinte = teinteDe(type);

        const flash = document.createElement('span');
        flash.className = 'flash';
        flash.style.color = teinte;
        flash.style.width = `${boutons[index].offsetWidth}px`;
        flash.style.height = `${boutons[index].offsetHeight}px`;
        poser(flash, x, y, 400);

        const onde = document.createElement('span');
        onde.className = 'onde';
        onde.style.color = teinte;
        poser(onde, x, y, 520);
    }

    function projeter(index, type, budget) {
        const { x, y } = centreDe(index);
        const teinte = teinteDe(type);
        const combien = Math.min(BRISURES_PAR_PIERRE, budget);
        for (let n = 0; n < combien; n += 1) {
            const angle = (n / combien) * Math.PI * 2 + Math.random() * 0.7;
            const portee = 26 + Math.random() * 42;
            const brisure = document.createElement('span');
            brisure.className = 'brisure';
            brisure.style.color = teinte;
            brisure.style.setProperty('--dx', `${Math.cos(angle) * portee}px`);
            brisure.style.setProperty('--dy', `${Math.sin(angle) * portee + 18}px`);
            brisure.style.setProperty('--tour', `${Math.round(Math.random() * 540 - 270)}deg`);
            brisure.style.setProperty('--duree', `${640 + Math.random() * 280}ms`);
            poser(brisure, x, y, 960);
        }
        return combien;
    }

    function secouer(cascade) {
        if (sobre || cascade < 2) return;
        plateau.style.setProperty('--force', String(Math.min(cascade + 1, 8)));
        plateau.classList.remove('secousse');
        void plateau.offsetWidth;
        plateau.classList.add('secousse');
        setTimeout(() => plateau.classList.remove('secousse'), 400);
    }

    function proclamer(texte) {
        if (sobre) return;
        const banniere = document.createElement('div');
        banniere.className = 'banniere';
        banniere.textContent = texte;
        poser(banniere, 0, 0, 1050);
        banniere.style.left = '';
        banniere.style.top = '';
    }

    function gain(etape) {
        if (sobre || !etape.points || !etape.effacees.length) return;
        const milieu = etape.effacees[Math.floor(etape.effacees.length / 2)].index;
        const { x } = centreDe(milieu);
        const bulle = document.createElement('span');
        bulle.className = 'gain';
        bulle.textContent = etape.cascade > 1 ? `+${etape.points} ×${etape.cascade}` : `+${etape.points}`;
        bulle.style.color = teinteDe(etape.effacees[0].type);
        poser(bulle, x, boutons[milieu].offsetTop, 1000);
    }

    // Une étoile brève, sur une pierre au hasard. Bejeweled fait miroiter chaque
    // pierre pour elle-même ; à soixante-quatre animations par image, ça ne
    // tient pas sur un téléphone. On obtient presque le même œil en semant des
    // étoiles éphémères, et le plateau n'est jamais immobile pour le coût d'un
    // seul élément à la fois.
    //
    // La cadence, elle, se mesure et ne se devine pas : à cinq par seconde,
    // 11 % des images passaient au-dessus de 20 ms en WebKit — le halo des
    // pierres, lui, ne coûtait rien. Trois par seconde tiennent les 60 images
    // et restent deux fois plus vivantes que la vitrine d'avant.
    function etoile() {
        const bouton = boutons[Math.floor(Math.random() * boutons.length)];
        if (!bouton?.firstChild?.classList.contains('pierre')) return;
        const brillant = document.createElement('span');
        brillant.className = 'scintille';
        poser(
            brillant,
            bouton.offsetLeft + bouton.offsetWidth * (0.2 + Math.random() * 0.6),
            bouton.offsetTop + bouton.offsetHeight * (0.15 + Math.random() * 0.6),
            820,
        );
    }

    function lancerScintillements() {
        if (horloge) clearInterval(horloge);
        horloge = setInterval(() => {
            if (sobre || !couche || document.hidden) return;
            etoile();
            if (Math.random() < 0.25) etoile();
        }, 320);
    }

    // ------------------------------------------------------------ Le coup

    function glisser(a, b) {
        const { x, y } = pas();
        const dx = ((b % colonnes) - (a % colonnes)) * x;
        const dy = (Math.floor(b / colonnes) - Math.floor(a / colonnes)) * y;
        const pierreA = boutons[a].firstChild;
        const pierreB = boutons[b].firstChild;
        if (pierreA?.classList.contains('pierre')) pierreA.style.transform = `translate(${dx}px, ${dy}px)`;
        if (pierreB?.classList.contains('pierre')) pierreB.style.transform = `translate(${-dx}px, ${-dy}px)`;
    }

    async function animerRefus(a, b) {
        selectionner(null);
        son.refuser();
        if (sobre) return;
        const { x, y } = pas();
        const dx = (((b % colonnes) - (a % colonnes)) * x) / 2;
        const dy = ((Math.floor(b / colonnes) - Math.floor(a / colonnes)) * y) / 2;
        for (const [index, signe] of [[a, 1], [b, -1]]) {
            boutons[index].style.setProperty('--refus-x', `${dx * signe}px`);
            boutons[index].style.setProperty('--refus-y', `${dy * signe}px`);
            boutons[index].classList.add('refus');
        }
        await attendre(300);
        for (const index of [a, b]) boutons[index].classList.remove('refus');
    }

    function marquer(etape) {
        let budget = BRISURES_MAX;
        for (const efface of etape.effacees) {
            const pierre = boutons[efface.index].firstChild;
            if (pierre?.classList.contains('pierre')) pierre.classList.add('part');
            if (sobre) continue;
            eclater(efface.index, efface.type);
            budget -= projeter(efface.index, efface.type, budget);
        }
        for (const brisee of etape.brisees) {
            const bloc = boutons[brisee.index].firstChild;
            if (bloc?.classList.contains('gangue')) bloc.classList.add('encaisse', 'fendue');
        }
    }

    function sonner(etape) {
        son.alignement(etape.cascade, etape.effacees.length);
        if (etape.brisees.length) son.gangue(etape.brisees.some((b) => b.couches === 0));
        for (const creation of etape.creations) son.taillee(creation.special);
    }

    async function jouerCoup(etatAvant, resultat) {
        const [a, b] = resultat.echange;
        if (estDiamant(etatAvant[a]) || estDiamant(etatAvant[b])) son.diamantActive();
        if (!sobre) {
            glisser(a, b);
            await attendre(190);
        }
        const apresEchange = etatAvant.map((cel) => (cel ? { ...cel } : null));
        [apresEchange[a], apresEchange[b]] = [apresEchange[b], apresEchange[a]];
        peindre(apresEchange);

        for (const etape of resultat.etapes) {
            marquer(etape);
            sonner(etape);
            gain(etape);
            secouer(etape.cascade);
            if (etape.cascade >= 2) proclamer(proclamationDe(etape.cascade));
            await attendre(sobre ? 20 : 210);
            peindre(etape.etat, etape.mouvements);
            for (const creation of etape.creations) {
                boutons[creation.index].firstChild?.classList.add('naissance');
            }
            await attendre(sobre ? 20 : 250);
        }
    }

    return {
        monter,
        peindre,
        selectionner,
        focaliser,
        animerRefus,
        jouerCoup,
        proclamer,
        indexDe: (element) => {
            const bouton = element.closest?.('.case');
            return bouton ? Number(bouton.dataset.index) : null;
        },
        reglerSobriete: (valeur) => { sobre = valeur; },
        get colonnes() { return colonnes; },
        get lignes() { return lignes; },
    };
}
