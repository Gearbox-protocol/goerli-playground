// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import {
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";

import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { ClaimZap } from "../types";
import { deploy } from "../utils/transaction";
import { Verifier } from "@gearbox-protocol/devops";

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

  const claimZap = await deploy<ClaimZap>(
      "ClaimZap",
      log,
      tokenDataByNetwork.Kovan.CRV,
      tokenDataByNetwork.Kovan.CVX
  )

  verifier.addContract({
    address: claimZap.address,
    constructorArguments: [tokenDataByNetwork.Kovan.CRV, tokenDataByNetwork.Kovan.CVX],
  });

  log.info(`ClaimZap was deployed at ${claimZap.address}`);

}

deployConvex()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
