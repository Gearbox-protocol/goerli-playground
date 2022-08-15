import {
  CurveAddLiquidity,
  MocksDeployer,
  PairV2Deployer,
  PriceFeedsDeployer,
  SyncerDeployer,
  TokensDeployer
} from "./src";

/**
 * This script deploys playground as whole
 */
async function playgroundDeploy(): Promise<void> {
  const syncer = new SyncerDeployer();
  await syncer.exec();

  const tokens = new TokensDeployer();
  await tokens.exec();

  const mocks = new MocksDeployer();
  await mocks.exec();

  const curveLiquidity = new CurveAddLiquidity();
  await curveLiquidity.exec();

  const priceFeeds = new PriceFeedsDeployer();
  await priceFeeds.exec();

  const pairs = new PairV2Deployer();
  await pairs.exec();
}

playgroundDeploy().catch(console.error);
