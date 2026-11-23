// Sert le build Angular de l'interface (dist/toolshop) sur le port 4200, avec repli sur index.html.
// Remplace « ng serve », trop gourmand en mémoire dans une VM Docker de 2 Go. Les fichiers sont relus à chaque
// requête : un nouveau build est servi dès qu'il est écrit.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.env['DIST'] ?? '/app/dist/toolshop';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

http.createServer((req, res) => {
  const chemin = path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const fichier = chemin.startsWith(RACINE) && fs.existsSync(chemin) && fs.statSync(chemin).isFile() ? chemin : path.join(RACINE, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(fichier)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(fichier).pipe(res);
}).listen(4200, '0.0.0.0');
