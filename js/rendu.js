// Le rendu : il ne connaît aucune règle, il rejoue ce que le moteur raconte.
//
// Chaque étape d'un coup porte l'état complet du plateau et la liste des
// mouvements. Le rendu efface, repeint, puis fait glisser les pierres depuis
// l'endroit d'où elles viennent — y compris de plusieurs rangs au-dessus de
// l'écran pour celles qui entrent en jeu.

import { estGangue, estDiamant, DIAMANT } from './moteur.js';

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

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

export function creerRendu(plateau) {
    let boutons = [];
    let colonnes = 8;
    let lignes = 8;
    let sobre = false;

    function monter(partie) {
        colonnes = partie.colonnes;
        lignes = partie.lignes;
        plateau.style.setProperty('--colonnes', colonnes);
        plateau.style.setProperty('--lignes', lignes);
        plateau.replaceChildren();
        boutons = [];
        for (let i = 0; i < colonnes * lignes; i += 1) {
            const bouton = document.createElement('button');
            bouton.type = 'button';
            bouton.className = 'case';
            bouton.dataset.index = String(i);
            bouton.setAttribute('aria-pressed', 'false');
            bouton.tabIndex = i === 0 ? 0 : -1;
            plateau.append(bouton);
            boutons.push(bouton);
        }
        peindre(partie.cases);
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
            bloc.className = cel.gangue > 1 ? 'gangue' : 'gangue fendue';
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
        for (const mouvement of mouvements) {
            const pierre = boutons[mouvement.vers].firstChild;
            if (!pierre || !pierre.classList.contains('pierre')) continue;
            const dx = (mouvement.colonne - (mouvement.vers % colonnes)) * x;
            const dy = (mouvement.ligne - Math.floor(mouvement.vers / colonnes)) * y;
            pierre.classList.add('arrive');
            pierre.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        // Un tour de boucle d'affichage plus tard, on relâche : la transition
        // CSS ramène chaque pierre à sa place.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            for (const mouvement of mouvements) {
                const pierre = boutons[mouvement.vers].firstChild;
                if (!pierre || !pierre.classList.contains('pierre')) continue;
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
        if (sobre) return;
        const { x, y } = pas();
        const dx = (((b % colonnes) - (a % colonnes)) * x) / 2;
        const dy = ((Math.floor(b / colonnes) - Math.floor(a / colonnes)) * y) / 2;
        for (const [index, signe] of [[a, 1], [b, -1]]) {
            const bouton = boutons[index];
            bouton.style.setProperty('--refus-x', `${dx * signe}px`);
            bouton.style.setProperty('--refus-y', `${dy * signe}px`);
            bouton.classList.add('refus');
        }
        await attendre(280);
        for (const index of [a, b]) boutons[index].classList.remove('refus');
    }

    function gain(etape) {
        if (sobre || !etape.points) return;
        const cibles = etape.effacees.map((e) => e.index);
        if (!cibles.length) return;
        const milieu = cibles[Math.floor(cibles.length / 2)];
        const bouton = boutons[milieu];
        const bulle = document.createElement('span');
        bulle.className = 'gain';
        bulle.textContent = etape.cascade > 1 ? `+${etape.points} ×${etape.cascade}` : `+${etape.points}`;
        bulle.style.left = `${bouton.offsetLeft + bouton.offsetWidth / 2}px`;
        bulle.style.top = `${bouton.offsetTop}px`;
        plateau.append(bulle);
        setTimeout(() => bulle.remove(), 900);
    }

    function marquer(etape) {
        for (const efface of etape.effacees) {
            const pierre = boutons[efface.index].firstChild;
            if (pierre?.classList.contains('pierre')) pierre.classList.add('part');
            if (!sobre) {
                boutons[efface.index].classList.add('eclabousse');
                setTimeout(() => boutons[efface.index].classList.remove('eclabousse'), 360);
            }
        }
        for (const brisee of etape.brisees) {
            const bloc = boutons[brisee.index].firstChild;
            if (bloc?.classList.contains('gangue')) bloc.classList.add('fendue');
        }
    }

    async function jouerCoup(etatAvant, resultat) {
        const [a, b] = resultat.echange;
        if (!sobre) {
            glisser(a, b);
            await attendre(200);
        }
        const apresEchange = etatAvant.map((cel) => (cel ? { ...cel } : null));
        [apresEchange[a], apresEchange[b]] = [apresEchange[b], apresEchange[a]];
        peindre(apresEchange);

        for (const etape of resultat.etapes) {
            marquer(etape);
            gain(etape);
            await attendre(sobre ? 20 : 200);
            peindre(etape.etat, etape.mouvements);
            await attendre(sobre ? 20 : 240);
        }
    }

    return {
        monter,
        peindre,
        selectionner,
        focaliser,
        animerRefus,
        jouerCoup,
        indexDe: (element) => {
            const bouton = element.closest?.('.case');
            return bouton ? Number(bouton.dataset.index) : null;
        },
        reglerSobriete: (valeur) => { sobre = valeur; },
        get colonnes() { return colonnes; },
        get lignes() { return lignes; },
    };
}
