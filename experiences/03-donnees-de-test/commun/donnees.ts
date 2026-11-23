import type { Entite, Firefly } from './api';
import { PREFIXE } from './comptes';

// Les données dont un test a besoin : un compte courant, une catégorie, un tag.
export type Donnees = { compte: Entite; categorie: Entite; tag: Entite };

export async function creerDonnees(firefly: Firefly, etiquette: string): Promise<Donnees> {
  const nom = `${PREFIXE} ${etiquette}`;
  return {
    compte: await firefly.creerCompte(`${nom} compte`),
    categorie: await firefly.creerCategorie(`${nom} catégorie`),
    tag: await firefly.creerTag(`${nom} tag`),
  };
}

export async function supprimerDonnees(firefly: Firefly, d: Donnees) {
  await firefly.supprimer('accounts', d.compte.id);
  await firefly.supprimer('categories', d.categorie.id);
  await firefly.supprimer('tags', d.tag.id);
}

export const unique = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
