// Le site de démo en local (compose.yml) : l'interface Angular et son API Laravel.
export const UI = process.env['UI_URL'] ?? 'http://localhost:4200';
export const API = process.env['API_URL'] ?? 'http://localhost:8091';
