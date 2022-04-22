// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { providers } from "ethers";

import { Logger } from "tslog";
import { deploy } from "../utils/transaction";
import { SYNCER } from "./constants";
import { TradingBot } from "../types";

const hre = require("hardhat");
const log: Logger = new Logger();


async function deployTradingBot(provider: providers.JsonRpcProvider, addr: string) {
  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const bot = await deploy<TradingBot>(
    "TradingBot",
    log,
    SYNCER
  );

  await bot.deployTransaction.wait(10);

  await hre.run("verify:verify", {
    address: bot.address,
    constructorArguments: [SYNCER],
  });
}


deployTradingBot()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
