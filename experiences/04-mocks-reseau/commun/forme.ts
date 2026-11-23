// Compare la forme de deux valeurs JSON : les clés et les types que l'interface lit dans la fixture
// doivent exister, avec le même type, dans la vraie réponse. Les tableaux sont comparés sur leur premier élément.
export function ecartsDeForme(attendu: unknown, recu: unknown, chemin = '$'): string[] {
  if (attendu === null) return []; // une valeur nulle dans la fixture n'impose aucun type
  const type = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  if (type(attendu) !== type(recu)) return [`${chemin} : ${type(attendu)} attendu, ${type(recu)} reçu`];
  if (Array.isArray(attendu)) {
    if (attendu.length === 0) return [];
    if ((recu as unknown[]).length === 0) return [`${chemin} : tableau vide`];
    return ecartsDeForme(attendu[0], (recu as unknown[])[0], `${chemin}[0]`);
  }
  if (type(attendu) === 'object') {
    return Object.entries(attendu as Record<string, unknown>).flatMap(([cle, valeur]) =>
      cle in (recu as object)
        ? ecartsDeForme(valeur, (recu as Record<string, unknown>)[cle], `${chemin}.${cle}`)
        : [`${chemin}.${cle} : absent`]);
  }
  return [];
}
