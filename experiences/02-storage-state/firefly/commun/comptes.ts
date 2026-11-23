// Compte de test de l'instance Firefly III jetable (compose.yml) : n'existe que dans ce conteneur.
export const UTILISATEUR = {
  email: 'labo@example.test',
  motDePasse: 'labo-exp02-mot-de-passe-de-test',
};

export const FIREFLY = process.env['FIREFLY_URL'] ?? 'http://localhost:8090';
