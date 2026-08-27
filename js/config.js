// Le seul numéro de version du jeu, lu par le code réellement chargé.
//
// Il vit à trois endroits que `tests/page.test.js` compare : package.json, la
// ligne du bas des Options — celle-ci — et le nom du cache de sw.js. Si le
// service worker sert un vieux cache, c'est le vieux numéro qui s'affiche :
// on voit d'un coup d'œil si la mise à jour est bien arrivée sur l'appareil.
export const VERSION = '1.3.0';
