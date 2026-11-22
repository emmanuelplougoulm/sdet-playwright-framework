import fs from 'node:fs';
import { ETAPE_CONNEXION } from './commun/LoginPage';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

// Reporter de mesure : compte les connexions par l'interface et le temps qu'elles prennent.
// Une connexion = une étape « Connexion par l’interface » (voir commun/LoginPage.ts).
// Il écrit ses chiffres dans le fichier indiqué par MESURE_SORTIE.
export default class MesureReporter implements Reporter {
  private connexions = 0;
  private msConnexion = 0;
  private setup: string | null = null;
  private tests = { passes: 0, echecs: 0, nonExecutes: 0 };

  private testsMetier = 0;

  // Les tests qui dépendent d'un setup en échec ne passent jamais par onTestEnd :
  // on les déduit du nombre total de tests métier.
  onBegin(_config: FullConfig, suite: Suite) {
    this.testsMetier = suite.allTests().filter((t) => t.parent.project()?.name !== 'setup').length;
  }

  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category === 'test.step' && step.title === ETAPE_CONNEXION) {
      this.connexions++;
      this.msConnexion += step.duration;
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Le projet setup n'est pas un test métier : on le compte à part.
    if (test.parent.project()?.name === 'setup') {
      this.setup = result.status;
      return;
    }
    if (result.status === 'skipped') this.tests.nonExecutes++;
    else if (test.outcome() === 'expected') this.tests.passes++;
    else if (result.retry === test.retries) this.tests.echecs++;
  }

  private nonExecutes() {
    const { passes, echecs, nonExecutes } = this.tests;
    return nonExecutes + (this.testsMetier - passes - echecs - nonExecutes);
  }

  onEnd(result: FullResult) {
    const sortie = process.env.MESURE_SORTIE;
    if (!sortie) return;
    fs.writeFileSync(sortie, JSON.stringify({
      statut: result.status,
      dureeMs: Math.round(result.duration),
      connexions: this.connexions,
      // Temps passé dans l'étape de connexion. Attention : il inclut le premier chargement de l'application
      // dans un navigateur neuf, que la version session paie aussi, au début de chaque test.
      msEtapeConnexion: Math.round(this.msConnexion),
      ...this.tests,
      nonExecutes: this.nonExecutes(),
      setup: this.setup,
    }));
  }
}
