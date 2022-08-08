import * as dotenv from "dotenv";
import {
  MultiCallContract,
  NetworkType,
  SupportedToken,
  supportedTokens,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { providers } from "ethers";
import { Logger } from "tslog";
import { ERC20__factory } from "../types";
import { ERC20Interface } from "../types/ERC20";
import config from "../config";

// checkTokens compares tokens on different networks
// it uses list of supportedTokens from @gearbox-protocol/sdk
// for each token it verifies that its symbol and decimals are the same on all networks
async function checkTokens() {
  dotenv.config({ path: ".env" });
  const log: Logger = new Logger();

  const mainnet = new providers.JsonRpcProvider(
    process.env.ETH_MAINNET_PROVIDER
  );
  const testnet = new providers.JsonRpcProvider(config.url);

  for (const t of Object.keys(supportedTokens)) {
    log.info(`Checking ${t}`);

    const mCalls: Array<keyof ERC20Interface["functions"]> = [
      // "name()",
      "symbol()",
      "decimals()",
    ];

    const getTokenData = async (
      t: SupportedToken,
      networkType: NetworkType
    ) => {
      if (tokenDataByNetwork[networkType][t] === "") {
        log.error(`Empty address for ${networkType}: ${t}`);
      }

      const tokenMutlicall = new MultiCallContract(
        tokenDataByNetwork[networkType][t],
        ERC20__factory.createInterface(),
        networkType === "Mainnet" ? mainnet : testnet
      );

      return tokenMutlicall.call(mCalls.map((method) => ({ method })));
    };

    const [mainnetData, testnetData] = await Promise.all([
      getTokenData(t as SupportedToken, "Mainnet"),
      getTokenData(t as SupportedToken, config.network),
    ]);

    for (let i = 0; i < mCalls.length; i++) {
      if (mainnetData[i] !== testnetData[i]) {
        log.error("Mainnet <> Testnet difference");
        log.error(`Mainnet data: ${mainnetData}`);
        log.error(`Testnet data: ${testnetData}`);
      }
    }
  }
}

checkTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
