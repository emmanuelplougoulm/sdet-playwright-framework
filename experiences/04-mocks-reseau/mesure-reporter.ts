import fs from 'node:fs';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

// Reporter de mesure : durée du run et bilan des tests métier (hors projet d'enregistrement).
// Il écrit ses chiffres dans le fichier indiqué par MESURE_SORTIE.
export default class MesureReporter implements Reporter {
  private attendus = 0;
  private passes = 0;
  private echecs = 0;
  private setup: string | null = null;
  private titresEnEchec: string[] = [];
  private erreurs: Record<string, number> = {};

  onBegin(_config: FullConfig, suite: Suite) {
    this.attendus = suite.allTests().filter((t) => t.parent.project()?.name !== 'enregistrer').length;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.parent.project()?.name === 'enregistrer') {
      this.setup = result.status;
      return;
    }
    if (result.retry < test.retries && result.status !== 'passed') return;
    if (result.status === 'passed') this.passes++;
    else if (result.status !== 'skipped') {
      this.echecs++;
      this.titresEnEchec.push(test.title);
      // Première ligne de l'erreur, pour regrouper les échecs par cause.
      const message = (result.error?.message ?? 'inconnue').split('\n')[0]!.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 120);
      this.erreurs[message] = (this.erreurs[message] ?? 0) + 1;
    }
  }

  onEnd(result: FullResult) {
    const sortie = process.env['MESURE_SORTIE'];
    if (!sortie) return;
    fs.writeFileSync(sortie, JSON.stringify({
      statut: result.status,
      dureeMs: Math.round(result.duration),
      attendus: this.attendus,
      passes: this.passes,
      echecs: this.echecs,
      // Les tests qui dépendent d'un setup en échec ne passent jamais par onTestEnd.
      nonExecutes: this.attendus - this.passes - this.echecs,
      setup: this.setup,
      titresEnEchec: this.titresEnEchec,
      erreurs: this.erreurs,
    }));
  }
}
