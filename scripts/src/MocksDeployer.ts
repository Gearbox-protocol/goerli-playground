import { AbstractScript } from "./AbstractScript";
import {
  ConvexDeployer,
  CurveDeployer,
  LidoDeployer,
  YearnDeployer
} from "./protocols";

/**
 * This script deploys DeFi protocol mocks: Lido, Curve, Convex, Yearn
 */
export class MocksDeployer extends AbstractScript {
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
