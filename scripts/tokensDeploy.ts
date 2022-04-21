// @ts-ignore
import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { providers } from "ethers";
import { SupportedTokens, tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { ERC20, ERC20__factory, ERC20Kovan } from "../types";
import { deploy } from "../utils/transaction";
import { Logger } from "tslog";

const hre = require("hardhat");

const tokensToDeploy: Array<SupportedTokens> = [
//   "1INCH",
//   "AAVE",
//   "COMP",
//   "CRV",
//   "DPI",
//   "FEI",
//   "SUSHI",
//   "UNI",
  "LQTY",
//   "WETH",
//   "YFI",

//   /// UPDATE
//   "STETH",
//   "FTM",
//   "CVX",
//   "FRAX",
//   "FXS",
  // "LDO",
  // "SPELL",
  // "LUSD",
  // "SUSD",
  // "GUSD",
  // "LUNA",
];

async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);

  let update = "{";

  const addr = [];

  for (let t of tokensToDeploy) {
    const mainnetAddress = tokenDataByNetwork.Mainnet[t];

    const mainnetToken = ERC20__factory.connect(
      mainnetAddress,
      mainnetProvider
    );

    const symbol = await mainnetToken.symbol();
    const name = await mainnetToken.name();
    const decimals = await mainnetToken.decimals();

    console.log(t, mainnetAddress);
    console.log(symbol);
    console.log(name);
    console.log(decimals);

    const newToken = await deploy<ERC20Kovan>(
      "ERC20Kovan",
      log,
      name,
      symbol,
      decimals
    );

    await newToken.deployTransaction.wait(10);

    await hre.run("verify:verify", {
      address: newToken.address,
      constructorArguments: [name, symbol, decimals],
    });

    update += `"${symbol}": ${newToken.address}\n`;
  }

  update += "}";

  console.log(update);
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
