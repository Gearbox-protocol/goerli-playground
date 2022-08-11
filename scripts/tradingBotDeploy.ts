// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";

import { Logger } from "tslog";
import { deploy } from "../utils/transaction";
import { TradingBot } from "../types";
import config from "../config";

const hre = require("hardhat");
const log: Logger = new Logger();

async function deployTradingBot() {
  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  if (chainId !== 42) throw new Error("Switch to test network");

  const bot = await deploy<TradingBot>("TradingBot", log, config.syncer);

  await bot.deployTransaction.wait(10);

  await hre.run("verify:verify", {
    address: bot.address,
    constructorArguments: [config.syncer],
  });
}

deployTradingBot()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
