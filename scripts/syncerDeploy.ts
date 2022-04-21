// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { Syncer } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";

const hre = require("hardhat");

const ROBOT = '0xd037ca7a2b62c66b0f01cb2c93b978493dcd06d6'

async function deploySyncer() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const syncer = await deploy<Syncer>("Syncer", log);
  await syncer.deployTransaction.wait(10);

  await waitForTransaction(syncer.addSyncer(ROBOT));

  await hre.run("verify:verify", {
    address: syncer.address,
  });
}

deploySyncer()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
