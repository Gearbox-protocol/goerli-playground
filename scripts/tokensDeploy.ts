// @ts-ignore
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { providers } from "ethers";
import {
  SupportedToken,
  tokenDataByNetwork,
  LOCAL_NETWORK,
  MAINNET_NETWORK,
} from "@gearbox-protocol/sdk";
import { ERC20__factory, ERC20Kovan } from "../types";
import { deploy } from "../utils/transaction";
import { Logger } from "tslog";

const hre = require("hardhat");

const tokensToDeploy: Array<SupportedToken> = [
  "1INCH",
  "AAVE",
  "COMP",
  "CRV",
  "DPI",
  "FEI",
  "SUSHI",
  "UNI",
  "LQTY",
  "WETH",
  "YFI",

  /// UPDATE
  "STETH",
  "FTM",
  "CVX",
  "FRAX",
  "FXS",
  "LDO",
  "SPELL",
  "LUSD",
  "sUSD",
  "GUSD",
  "LUNA",
];

// deployTokens deploys mock ERC20 contracts for each of provided tokens
// it copies name, symbol and decimals from mainnet, origin contract address is taken from @gearbox-protocol/sdk mainnet mapping
async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) {
    throw new Error("ETH_MAINNET_PROVIDER is not defined");
  }

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();
  if (chainId === MAINNET_NETWORK) {
    throw new Error("Switch to test network");
  }
  log.debug(`Deploying on ${chainId}`);

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);

  const update: Record<string, string> = {};

  for (const t of tokensToDeploy) {
    const mainnetAddress = tokenDataByNetwork.Mainnet[t];

    const mainnetToken = ERC20__factory.connect(
      mainnetAddress,
      mainnetProvider
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

    if (chainId !== LOCAL_NETWORK) {
      await newToken.deployTransaction.wait(10);

      await hre.run("verify:verify", {
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
