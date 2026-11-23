// Compte de test de l'instance Firefly III jetable (compose.yml) : n'existe que dans ce conteneur.
export const UTILISATEUR = {
  email: 'labo@example.test',
  motDePasse: 'labo-exp03-mot-de-passe-de-test',
};

export const FIREFLY = process.env['FIREFLY_URL'] ?? 'http://localhost:8091';

// Toutes les données créées par l'expérience portent ce préfixe : on peut ainsi compter ce qui reste en base.
export const PREFIXE = 'labo03';
