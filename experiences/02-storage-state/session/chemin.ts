import path from 'node:path';

// Fichier où le projet setup enregistre la session (cookies + localStorage). Ignoré par Git.
export const SESSION = path.join(__dirname, '../.auth/client.json');
