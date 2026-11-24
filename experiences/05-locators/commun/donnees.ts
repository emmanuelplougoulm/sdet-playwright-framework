// Le site de démo de l'expérience 04, en local : interface et identifiants fixés par son seed.
export const UI = process.env['UI_URL'] ?? 'http://localhost:4200';
export const CATEGORIES: Record<string, string> = { Hammer: '01M84XKTH28QBAD4P60845G1JZ' };
export const PINCES_COMBINEES = '01M84XKTJGDS661NWRHHZ48M1F';
export const exactement = (texte: string) => new RegExp(`^\\s*${texte}\\s*$`);
