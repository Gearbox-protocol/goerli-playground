import { deploy, detectNetwork, Verifier } from "@gearbox-protocol/devops";
import { tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { ethers } from "hardhat";

import { WstETH } from "../types";

async function deployTokens() {
  const verifier = new Verifier();
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const provider = deployer.provider;

  if (!provider) throw new Error("Cant get provider");

  const networkId = await detectNetwork();

  if (networkId !== "Goerli") {
    throw new Error("Can be run on Goerli only");
  }

  const wstETH = await deploy<WstETH>(
    "WstETH",
    undefined,
    tokenDataByNetwork.Goerli.STETH,
  );

  verifier.addContract({
    address: wstETH.address,
    constructorArguments: [tokenDataByNetwork.Goerli.STETH],
  });
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
