// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import {
  ConvexLPToken,
  convexTokens,
  RAY,
  tokenDataByNetwork,
  TokenType,
} from "@gearbox-protocol/sdk";

import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { ERC20Kovan__factory, KovanConvexManager } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { SYNCER } from "./constants";
import { Verifier } from "@gearbox-protocol/devops";

const hre = require("hardhat");

const tokenList: ConvexLPToken[] = [
  "cvx3Crv",
  "cvxsteCRV",
  "cvxcrvPlain3andSUSD",
  "cvxFRAX3CRV",
  "cvxgusd3CRV",
];

async function deployConvex() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();
  const verifier: Verifier = new Verifier();

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

  verifier.addContract({
    address: convexManager.address,
    constructorArguments: [SYNCER, tokenDataByNetwork.Kovan.CRV],
  });

  log.info(`KovanConvexManager was deployed at ${convexManager.address}`);

  log.info("Adding pools");
  const crvToken = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.CRV,
    deployer
  );

  for (let poolToken of tokenList) {
    log.debug("Pool:", poolToken);
    const convexData = convexTokens[poolToken];

    if (convexData.type != TokenType.CONVEX_LP_TOKEN) {
      throw "Incorrect convex data";
    }

    const crvTknAddress = tokenDataByNetwork.Kovan[convexData.underlying];

    const crvTkn = ERC20Kovan__factory.connect(crvTknAddress, deployer);

    log.debug("Minting");
    await waitForTransaction(crvToken.mint(deployer.address, RAY));

    // log.debug("Approving: [1/4]");
    // await waitForTransaction(crvTkn.approve(convexManager.address, 0));

    log.debug("Approving: [1/2]");
    await waitForTransaction(crvTkn.approve(convexManager.address, RAY));

    // log.debug("Approving: [3/4]");
    // await waitForTransaction(crvToken.approve(convexManager.address, 0));

    log.debug("Approving: [2/2]");
    await waitForTransaction(crvToken.approve(convexManager.address, RAY));

    log.debug("Adding base pool with bid:", convexData.pid);
    await waitForTransaction(
      convexManager.addBasePool(crvTkn.address, convexData.pid)
    );
  }

  const totalPools = (await convexManager.deployedPoolsLength()).toNumber();

  for (let i = 0; i < totalPools; i++) {
    const tkn = tokenList[i];
    log.debug(`Pool #${i} for ${tkn}: ${await convexManager.deployedPools(i)}`);
  }
}

deployConvex()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
