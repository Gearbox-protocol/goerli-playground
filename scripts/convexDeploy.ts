// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { ERC20Kovan__factory, KovanConvexManager } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { SYNCER } from "./constants";
import {
  ERC20__factory,
  RAY,
  tokenDataByNetwork,
  WAD,
} from "@gearbox-protocol/sdk";

const hre = require("hardhat");

const crvList = [
  tokenDataByNetwork.Kovan["3Crv"],
  tokenDataByNetwork.Kovan.steCRV,
  // tokenDataByNetwork.Kovan.crvPlain3andSUSD,
];

async function deployConvex() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  const convexManager = await deploy<KovanConvexManager>(
    "KovanConvexManager",
    log,
    SYNCER,
    tokenDataByNetwork.Kovan.CRV
  );

  log.info(`KovanConvexManager was deployed at ${convexManager.address}`);
  const crvToken = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.CRV,
    deployer
  );

  for (let poolToken of crvList) {
    const crvTkn = ERC20Kovan__factory.connect(poolToken, deployer);

    await waitForTransaction(crvToken.mint(deployer.address, RAY));
    await waitForTransaction(crvTkn.approve(convexManager.address, 0));
    await waitForTransaction(crvTkn.approve(convexManager.address, RAY));
    await waitForTransaction(crvToken.approve(convexManager.address, 0));
    await waitForTransaction(crvToken.approve(convexManager.address, RAY));
    await waitForTransaction(convexManager.addBasePool(poolToken));
  }

  const totalPools = (await convexManager.deployedPoolsLength()).toNumber();

 await hre.run("verify:verify", {
    address: convexManager.address,
    constructorArguments: [SYNCER, tokenDataByNetwork.Kovan.CRV],
  });

  for (let i = 0; i < totalPools; i++) {
    const tkn = crvList[i];
    log.debug(`Pool #${i}: ${await convexManager.deployedPools(i)}`);
  }

 
}

deployConvex()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
