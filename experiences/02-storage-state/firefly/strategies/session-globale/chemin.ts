import path from 'node:path';

// Fichier où le projet setup enregistre la session (cookies). Ignoré par Git.
export const SESSION = path.join(__dirname, '../../.auth/session.json');
