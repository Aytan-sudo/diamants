// Le message que l'on envoie à un ami.
//
// Il doit tenir dans un SMS et ne rien dévoiler : le lien porte la date, jamais
// la solution. Celui qui l'ouvre tombe sur exactement la même grille et les
// mêmes commandes — sinon comparer deux scores n'aurait aucun sens.

import { avancement, dateLisible } from './objectifs.js';

export const URL_JEU = 'https://aytan-sudo.github.io/diamants/';

const EMOJIS = {
    rubis: '🔴',
    emeraude: '🟢',
    saphir: '🔵',
    amethyste: '🟣',
    topaze: '🟡',
    quartz: '⚪',
    onyx: '⚫',
};
const EMOJI_GANGUE = '🪨';
const EMOJI_SPECIALE = '💎';
const EMOJI_VIDE = '◽';
const LARGEUR_BARRE = 5;

export function emojiDe(objectif) {
    if (objectif.genre === 'recolte') return EMOJIS[objectif.type] ?? EMOJI_SPECIALE;
    if (objectif.genre === 'gangue') return EMOJI_GANGUE;
    return EMOJI_SPECIALE;
}

function barre(objectif, fait) {
    const pleins = Math.min(LARGEUR_BARRE, Math.round((fait / objectif.quantite) * LARGEUR_BARRE));
    const complet = fait >= objectif.quantite ? LARGEUR_BARRE : Math.min(pleins, LARGEUR_BARRE - 1);
    return emojiDe(objectif).repeat(complet) + EMOJI_VIDE.repeat(LARGEUR_BARRE - complet);
}

const points = (valeur) => valeur.toLocaleString('fr-FR');

export function texteDuJour(defi, partie, reussi) {
    const lignes = [`Diamants ${dateLisible(defi.cle)}`];
    lignes.push(reussi
        ? `Réussi en ${partie.coupsJoues}/${defi.coupsMax} coups · ${points(partie.score)} pts`
        : `Échoué en ${defi.coupsMax} coups · ${points(partie.score)} pts`);
    for (const objectif of defi.objectifs) {
        const fait = avancement(partie, objectif);
        lignes.push(`${barre(objectif, fait)} ${Math.min(fait, objectif.quantite)}/${objectif.quantite}`);
    }
    lignes.push(`${URL_JEU}#jour=${defi.cle}`);
    return lignes.join('\n');
}

export function textePartieLibre(nomDuMode, partie) {
    const lignes = [`Diamants — ${nomDuMode}`, `${points(partie.score)} pts en ${partie.coupsJoues} coups`];
    if (partie.cascadeMax >= 3) lignes.push(`Meilleure cascade ×${partie.cascadeMax}`);
    lignes.push(`${URL_JEU}#partie=${encodeURIComponent(partie.graine)}`);
    return lignes.join('\n');
}

// iOS et Android n'ont jamais réussi à se mettre d'accord sur la ponctuation
// d'un lien sms:. On sert donc les deux formes selon l'appareil.
export function lienSms(texte, agent = globalThis.navigator?.userAgent ?? '') {
    const corps = encodeURIComponent(texte);
    const pomme = /iPad|iPhone|iPod|Macintosh/.test(agent);
    return pomme ? `sms:&body=${corps}` : `sms:?body=${corps}`;
}

export function lireFragment(hash) {
    if (!hash) return null;
    const jour = /[#&]jour=(\d{4}-\d{2}-\d{2})/.exec(hash);
    if (jour) return { genre: 'jour', valeur: jour[1] };
    const partie = /[#&]partie=([^&]+)/.exec(hash);
    if (partie) return { genre: 'partie', valeur: decodeURIComponent(partie[1]) };
    return null;
}
