// @ts-ignore
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";

import {
  SupportedTokens,
  tokenDataByNetwork,
  YearnMock,
} from "@gearbox-protocol/sdk";
import { deploy } from "../utils/transaction";
import { Logger } from "tslog";
import { SYNCER } from "./constants";

const hre = require("hardhat");
const log: Logger = new Logger();

const tokens = [
  // "WETH", 
  "WBTC",
//  "steCRV"
];

async function deployYearniceFeeds() {
  dotenv.config({ path: ".env.local" });

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  for (let t of tokens) {
    const tokenAddress = tokenDataByNetwork.Kovan[t as SupportedTokens];
    const vault = await deploy<YearnMock>(
      "YearnMock",
      log,
      SYNCER,
      tokenAddress
    );

    await vault.deployTransaction.wait(10);

    await hre.run("verify:verify", {
      address: vault.address,
      constructorArguments: [SYNCER, tokenAddress],
    });

    console.log(`${t}: ${vault.address}`);
  }
}

deployYearniceFeeds()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
