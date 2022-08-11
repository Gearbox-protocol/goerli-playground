import { NormalToken, tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { run } from "hardhat";

import config from "../config";
import { ERC20__factory, ERC20Kovan } from "../types";
import { deploy } from "../utils/transaction";
import { AbstractScript } from "./support";

const tokensToDeploy: Array<NormalToken> = [
  "1INCH",
  "AAVE",
  "COMP",
  "CRV",
  "DAI",
  "DPI",
  "FEI",
  "LINK",
  "SNX",
  "SUSHI",
  "UNI",
  "USDT",
  "USDC",
  "WBTC",
  // "WETH", -- not needed here, stable addresses on all testnets

  "YFI",
  /// UPDATE
  // "STETH", -- Not needed here, deployed in LidoDeployer
  "FTM",
  // "CVX",  -- Not needed here, deployed in ConvexDeployer
  "FRAX",
  "FXS",
  "LDO",
  "SPELL",
  "LUSD",
  "sUSD",
  "GUSD",
  "LUNA",
  "LQTY",
];

// TokensDeployer deploys mock ERC20 contracts for each of provided normal tokens
// it copies name, symbol and decimals from mainnet, origin contract address is taken from @gearbox-protocol/sdk mainnet mapping
class TokensDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const update: Record<string, string> = {};

    for (const t of tokensToDeploy) {
      const addr = await this.maybeDeployToken(t);
      update[t] = addr;
    }

    this.log.info("Done");
    this.log.info(update);
  }

  /**
   * Deploys normal token or reads it from progress
   * @param t token symbol
   * @returns token address
   */
  private async maybeDeployToken(t: NormalToken): Promise<string> {
    let addr = await this.progressTracker.getProgress("normalTokens", t);
    if (!addr) {
      addr = await this.deployToken(t);
      await this.progressTracker.saveProgress("normalTokens", t, addr);
    }
    return addr;
  }

  /**
   * Deploys normal token
   * @param t token symbol
   * @returns token address
   */
  private async deployToken(t: NormalToken): Promise<string> {
    const mainnetAddress = tokenDataByNetwork.Mainnet[t];

    const mainnetToken = ERC20__factory.connect(
      mainnetAddress,
      this.mainnetProvider
    );

    const symbol = await mainnetToken.symbol();
    const name = await mainnetToken.name();
    const decimals = await mainnetToken.decimals();

    this.log.debug(
      `Token ${symbol} at ${mainnetAddress}, ${decimals} decimals, Name = ${name}`
    );

    const newToken = await deploy<ERC20Kovan>(
      "ERC20Kovan",
      this.log,
      name,
      symbol,
      decimals
    );

    await newToken.deployTransaction.wait(config.confirmations);
    if (this.canVerify) {
      await run("verify:verify", {
        address: newToken.address,
        constructorArguments: [name, symbol, decimals],
      });
    }
    return newToken.address;
  }
}

new TokensDeployer().exec().catch(console.error);
