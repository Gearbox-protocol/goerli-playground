import {
  LOCAL_NETWORK,
  SupportedToken,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { run } from "hardhat";
import { Logger } from "tslog";
import config from "../config";
import { ERC20Kovan, ERC20__factory } from "../types";
import setupScriptRuntime from "../utils/setupScriptRuntime";
import { deploy } from "../utils/transaction";

const tokensToDeploy: Array<SupportedToken> = [
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
  // "WETH",

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

// deployTokens deploys mock ERC20 contracts for each of provided tokens
// it copies name, symbol and decimals from mainnet, origin contract address is taken from @gearbox-protocol/sdk mainnet mapping
async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const runtime = await setupScriptRuntime();

  const update: Record<string, string> = {};

  for (const t of tokensToDeploy) {
    const mainnetAddress = tokenDataByNetwork.Mainnet[t];

    const mainnetToken = ERC20__factory.connect(
      mainnetAddress,
      runtime.mainnetProvider
    );

    const symbol = await mainnetToken.symbol();
    const name = await mainnetToken.name();
    const decimals = await mainnetToken.decimals();

    console.log(
      `Token ${symbol} at ${mainnetAddress}, ${decimals} decimals, Name = ${name}`
    );

    const newToken = await deploy<ERC20Kovan>(
      "ERC20Kovan",
      log,
      name,
      symbol,
      decimals
    );

    await newToken.deployTransaction.wait(config.confirmations);
    if (runtime.chainId !== LOCAL_NETWORK) {
      await run("verify:verify", {
        address: newToken.address,
        constructorArguments: [name, symbol, decimals],
      });
    }

    update[symbol] = newToken.address;
  }

  console.log(update);
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
