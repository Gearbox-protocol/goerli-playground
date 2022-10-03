import { deploy, Verifier } from "@gearbox-protocol/devops";
import { tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { ethers } from "hardhat";
import { Logger } from "tslog";

import { YearnMock } from "../types";

async function deployWETH() {
  const verifier = new Verifier();
  const log = new Logger();

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(deployer.address);
  const yvWETH = await deploy<YearnMock>(
    "YearnMock",
    log,
    "0x7c8243e9948a398d359bc979812b943A5CE9b845",
    tokenDataByNetwork.Goerli.WETH,
    "WETH",
  );
  verifier.addContract({
    address: yvWETH.address,
    constructorArguments: [
      "0x7c8243e9948a398d359bc979812b943A5CE9b845",
      tokenDataByNetwork.Goerli.WETH,
      "WETH",
    ],
  });
  console.log(`yvWETH deployer at ${yvWETH.address}`);
}

deployWETH()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
