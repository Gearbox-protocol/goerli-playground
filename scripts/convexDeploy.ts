// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { KovanConvexManager } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { SYNCER } from "./constants";
import { ERC20__factory, RAY, tokenDataByNetwork } from "@gearbox-protocol/sdk";

const hre = require("hardhat");

const crvList = [
  tokenDataByNetwork.Kovan["3Crv"],
  tokenDataByNetwork.Kovan.steCRV,
  tokenDataByNetwork.Kovan.crvPlain3andSUSD,
];

async function deployConvex() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const convexManager = await deploy<KovanConvexManager>(
    "KovanConvexManager",
    log,
    SYNCER,
    tokenDataByNetwork.Kovan.CRV
  );

  log.info(`KovanConvexManager was deployed at ${convexManager.address}`);
  const crvToken = ERC20__factory.connect(
    tokenDataByNetwork.Kovan.CRV,
    deployer
  );

  for (let poolToken of crvList) {
    await waitForTransaction(crvToken.approve(convexManager.address, RAY));
    await waitForTransaction(convexManager.addBasePool(poolToken));
  }

  const totalPools = (await convexManager.deployedPoolsLength()).toNumber();

  for (let i = 0; i < totalPools; i++) {
    log.debug(`Pool #${i}: ${await convexManager.deployedPools(i)}`);
  }

  await hre.run("verify:verify", {
    address: convexManager.address,
    constructorArguments: [SYNCER, tokenDataByNetwork.Kovan.CRV],
  });
}

deployConvex()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
