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
import {
  ERC20Kovan__factory,
  KovanConvexManager,
  BaseRewardPool__factory,
  ClaimZap,
} from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { SYNCER } from "./constants";
import { Verifier } from "@gearbox-protocol/devops";

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

  const boosterAddr = await convexManager.booster();
  const cvxAddr = await convexManager.cvx();

  verifier.addContract({
    address: boosterAddr,
    constructorArguments: [cvxAddr, tokenDataByNetwork.Kovan.CRV],
  });

  verifier.addContract({
    address: cvxAddr,
    constructorArguments: [],
  });

  log.info(`Convex Booster mock was deployed at ${boosterAddr}`);
  log.info(`CVX token mock was deployed at ${cvxAddr}`);

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

    log.debug("Adding base pool with pid:", convexData.pid);
    await waitForTransaction(
      convexManager.addBasePool(crvTkn.address, convexData.pid)
    );

    const numPools = await convexManager.deployedPoolsLength();
    const poolAddress = await convexManager.deployedPools(numPools.sub(1));

    console.log(poolAddress);

    const basePool = BaseRewardPool__factory.connect(poolAddress, deployer);

    const pid = convexData.pid;
    const stakingToken = await basePool.stakingToken();
    const rewardToken = crvToken.address;
    const operator = await convexManager.booster();
    const manager = convexManager.address;

    verifier.addContract({
      address: poolAddress,
      constructorArguments: [pid, stakingToken, rewardToken, operator, manager],
    });

    log.info(`Pool for ${poolToken} deployed at: ${poolAddress}`);
    log.info(`${poolToken} token deployed at: ${stakingToken}`);
  }

  const claimZap = await deploy<ClaimZap>(
    "ClaimZap",
    log,
    tokenDataByNetwork.Kovan.CRV,
    cvxAddr
  );

  verifier.addContract({
    address: claimZap.address,
    constructorArguments: [tokenDataByNetwork.Kovan.CRV, cvxAddr],
  });

  log.info(`ClaimZap was deployed at ${claimZap.address}`);
}

deployConvex()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
