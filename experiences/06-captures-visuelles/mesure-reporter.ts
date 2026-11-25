import fs from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

// Reporter de mesure : pour chaque capture, le statut et la part de pixels différents.
// Playwright arrondit le ratio à deux décimales dans son message : on le recalcule à partir du nombre
// de pixels et des dimensions de l'image reçue (lues dans l'en-tête du PNG).
type Capture = { projet: string; titre: string; statut: string; pixels: number; ratio: number; tailleDifferente: boolean; erreur?: string };

function dimensionsPng(fichier: string | undefined): [number, number] | null {
  if (!fichier || !fs.existsSync(fichier)) return null;
  const b = fs.readFileSync(fichier);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

export default class MesureReporter implements Reporter {
  private captures: Capture[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'skipped') return;
    const projet = test.parent.project()?.name ?? '?';
    const message = (result.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '');
    const capture: Capture = { projet, titre: test.title, statut: result.status, pixels: 0, ratio: 0, tailleDifferente: false };
    if (result.status !== 'passed') {
      capture.erreur = message.split('\n').find((l) => l.trim())?.trim().slice(0, 160);
      const taille = message.match(/Expected an image (\d+)px by (\d+)px, received (\d+)px by (\d+)px/);
      const pixels = message.match(/(\d+) pixels \(ratio [\d.]+ of all image pixels\) are different/);
      const recue = dimensionsPng(result.attachments.find((a) => a.name.endsWith('-actual.png'))?.path);
      capture.tailleDifferente = Boolean(taille);
      if (pixels) {
        capture.pixels = Number(pixels[1]);
        const [l, h] = taille ? [Math.max(+taille[1]!, +taille[3]!), Math.max(+taille[2]!, +taille[4]!)] : recue ?? [0, 0];
        capture.ratio = l && h ? capture.pixels / (l * h) : 1;
      } else {
        // Pas de nombre de pixels : capture d'une autre taille sans comparaison, ou échec avant la capture.
        capture.ratio = 1;
      }
    }
    this.captures.push(capture);
  }

  onEnd(result: FullResult) {
    const sortie = process.env['MESURE_SORTIE'];
    if (!sortie) return;
    fs.writeFileSync(sortie, JSON.stringify({ statut: result.status, dureeMs: Math.round(result.duration), captures: this.captures }));
  }
}
