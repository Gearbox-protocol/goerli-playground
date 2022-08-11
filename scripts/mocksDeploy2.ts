import { LidoDeployer } from "./protocols";
import { AbstractScript } from "./support";

class MocksDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const lido = new LidoDeployer();
    await lido.exec();
  }
}

new MocksDeployer().exec().catch(console.log);
