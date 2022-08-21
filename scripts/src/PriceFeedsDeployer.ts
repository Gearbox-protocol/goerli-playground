import {
  OracleType,
  priceFeedsByNetwork,
  SupportedToken,
  TokenPriceFeedData,
} from "@gearbox-protocol/sdk";

import { ChainlinkPriceFeed, ChainlinkPriceFeed__factory } from "../../types";
import { AbstractScript } from "./AbstractScript";
import { ChainlinkProgressKey, ChainlinkSuffix } from "./types";

/**
 * This script deploys chainlink price feed that will be synced with mainnet
 */
export class PriceFeedsDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    for (const [sym, pf] of Object.entries(priceFeedsByNetwork)) {
      await this.maybeDeployPF(sym as SupportedToken, pf, "priceFeedETH");
      await this.maybeDeployPF(sym as SupportedToken, pf, "priceFeedUSD");
    }
  }

  /**
   * Deploys price feed for on testnet if it's not deployed yet and tracks the progress
   * Will skip non-Chainlink feeds
   * Will skip the feeds that haven't been deployed on mainnet
   * @param token SupportedToken
   * @param data
   * @param kind ETH or USD price feed
   * @returns
   */
  private async maybeDeployPF(
    token: SupportedToken,
    data: TokenPriceFeedData,
    kind: keyof TokenPriceFeedData,
  ): Promise<void> {
    const pf = data[kind];
    const suffix: ChainlinkSuffix = kind === "priceFeedETH" ? "ETH" : "USD";
    if (pf?.type !== OracleType.CHAINLINK_ORACLE) {
      return;
    }
    const name: ChainlinkProgressKey = `${token}/${suffix}`;
    const mainnetAddr = pf.address.Mainnet;
    if (!mainnetAddr) {
      this.log.warn(`Feed ${name} is not deployed on mainnet`);
      return;
    }
    let testnetAddr = await this.progress.get("chainlink", name);
    if (!testnetAddr) {
      this.log.info(`Deploying price feed ${name} for oracle: ${mainnetAddr}`);
      testnetAddr = await this.deployPF(mainnetAddr);
      this.log.debug(`Deplyed ${name} at ${testnetAddr}`);
      await this.progress.save("chainlink", name, testnetAddr);
    } else {
      this.log.debug(`Already deployed ${name} at ${testnetAddr}`);
      const pfeed = ChainlinkPriceFeed__factory.connect(
        testnetAddr,
        this.deployer,
      );
      try {
        await pfeed.mainnetOracle();
      } catch (e) {}
    }
  }

  private async deployPF(mainnetAddr: string): Promise<string> {
    const mainnetPF = ChainlinkPriceFeed__factory.connect(
      mainnetAddr,
      this.mainnetProvider,
    );

    const decimals = await mainnetPF.decimals();
    const testnetPF = await this.deploy<ChainlinkPriceFeed>(
      "ChainlinkPriceFeed",
      this.syncer,
      decimals,
      mainnetAddr,
    );

    return testnetPF.address;
  }
}
