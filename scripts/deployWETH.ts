import { deploy, Verifier } from "@gearbox-protocol/devops";
import { ethers } from "hardhat";
import { Logger } from "tslog";

import { SafeWETH } from "../types";

async function deployWETH() {
  const verifier = new Verifier();
  const log = new Logger();

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(deployer.address);
  const safeWETH = await deploy<SafeWETH>("SafeWETH", log);
  verifier.addContract({
    address: safeWETH.address,
    constructorArguments: [],
  });
  console.log(`SafeWETH deployer at ${safeWETH.address}`);
}

deployWETH()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
