// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import {
    Lido
} from "../types";
import { Verifier, deploy } from "@gearbox-protocol/devops";
import { SYNCER } from "./constants";

async function deployLido() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();
  const verifier: Verifier = new Verifier();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  const lido = await deploy<Lido>(
      "Lido",
      log,
      SYNCER
  )

  verifier.addContract({
      address: lido.address,
      constructorArguments: [SYNCER]
  })

}

deployLido()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
