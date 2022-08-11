import { CurveDeployer, LidoDeployer } from "./protocols";
import { AbstractScript } from "./support";

class MocksDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const lido = new LidoDeployer();
    await lido.exec();

    const curve = new CurveDeployer();
    await curve.exec();
  }
}

new MocksDeployer().exec().catch(console.log);
