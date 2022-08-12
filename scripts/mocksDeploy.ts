import {
  ConvexDeployer,
  CurveDeployer,
  LidoDeployer,
  YearnDeployer,
} from "./protocols";
import { AbstractScript } from "./support";

/**
 * This script deploys DeFi protocol mocks: Lido, Curve, Convex, Yearn
 */
class MocksDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const lido = new LidoDeployer();
    await lido.exec();

    const curve = new CurveDeployer();
    await curve.exec();

    const convex = new ConvexDeployer();
    await convex.exec();

    const yearn = new YearnDeployer();
    await yearn.exec();
  }
}

new MocksDeployer().exec().catch(console.log);
