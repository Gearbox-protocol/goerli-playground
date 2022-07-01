import * as dotenv from "dotenv";
import {
  MultiCallContract,
  NetworkType,
  SupportedToken,
  supportedTokens,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { ethers, providers } from "ethers";
import { Logger } from "tslog";
import { ERC20__factory } from "../types";
import { ERC20Interface } from "../types/ERC20";

async function checkTokens() {
  dotenv.config({ path: ".env" });
  const log: Logger = new Logger();

  const providersByNetwork: Record<NetworkType, providers.JsonRpcProvider> = {
    Mainnet: new providers.JsonRpcProvider(process.env.ETH_MAINNET_PROVIDER),
    Kovan: new providers.JsonRpcProvider(process.env.ETH_KOVAN_PROVIDER),
  };

  for (let t of Object.keys(supportedTokens)) {
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
        providersByNetwork[networkType]
      );

      return tokenMutlicall.call(mCalls.map((method) => ({ method })));
    };

    const [mainnetData, kovanData] = await Promise.all([
      getTokenData(t as SupportedToken, "Mainnet"),
      getTokenData(t as SupportedToken, "Kovan"),
    ]);

    for (let i = 0; i < mCalls.length; i++) {
      if (mainnetData[i] !== kovanData[i]) {
        log.error("Mainnet <> Kovan difference");
        log.error(`Mainnet data: ${mainnetData}`);
        log.error(`Kovan data: ${kovanData}`);
      }
    }
  }
}

checkTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
