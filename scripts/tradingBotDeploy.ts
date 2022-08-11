import { ethers, run } from "hardhat";
import { Logger } from "tslog";

import config from "../config";
import { TradingBot } from "../types";
import { deploy } from "../utils/transaction";

const log: Logger = new Logger();

async function deployTradingBot() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  if (chainId !== 42) throw new Error("Switch to test network");

  const bot = await deploy<TradingBot>("TradingBot", log, config.syncer);

  await bot.deployTransaction.wait(10);

  await run("verify:verify", {
    address: bot.address,
    constructorArguments: [config.syncer],
  });
}

deployTradingBot()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
