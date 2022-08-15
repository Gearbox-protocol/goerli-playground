import {
  MultiCallContract,
  NetworkType,
  SupportedToken,
  supportedTokens,
  tokenDataByNetwork
} from "@gearbox-protocol/sdk";

import config from "../config";
import { ERC20__factory } from "../types";
import { ERC20Interface } from "../types/@openzeppelin/contracts/token/ERC20/ERC20";
import { AbstractScript } from "./src/AbstractScript";

const mCalls: Array<keyof ERC20Interface["functions"]> = [
  "symbol()",
  "decimals()"
];

class TokensChecker extends AbstractScript {
  protected async run(): Promise<void> {
    for (const t of Object.keys(supportedTokens)) {
      this.log.info(`Checking ${t}`);

      const [mainnetData, testnetData] = await Promise.all([
        this.getTokenData(t as SupportedToken, "Mainnet"),
        this.getTokenData(t as SupportedToken, config.network)
      ]);

      for (let i = 0; i < mCalls.length; i++) {
        if (mainnetData[i] !== testnetData[i]) {
          this.log.error("Mainnet <> Testnet difference");
          this.log.error(`Mainnet data: ${mainnetData}`);
          this.log.error(`Testnet data: ${testnetData}`);
        }
      }
    }
  }

  protected async getTokenData(t: SupportedToken, networkType: NetworkType) {
    if (tokenDataByNetwork[networkType][t] === "") {
      this.log.error(`Empty address for ${networkType}: ${t}`);
    }

    const tokenMutlicall = new MultiCallContract(
      tokenDataByNetwork[networkType][t],
      ERC20__factory.createInterface(),
      networkType === "Mainnet" ? this.mainnetProvider : this.testnetProvider
    );

    return tokenMutlicall.call(mCalls.map(method => ({ method })));
  }
}

new TokensChecker().exec().catch(console.error);
