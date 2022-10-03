import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractsByNetwork,
  IAddressProvider__factory,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { ethers } from "hardhat";

import { SafeWETH__factory } from "../types";

async function allowWETH() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(deployer.address);

  const safeWETH = SafeWETH__factory.connect(
    tokenDataByNetwork.Goerli.WETH,
    deployer,
  );

  const ap = IAddressProvider__factory.connect(
    "0x95f4cea53121b8A2Cb783C6BFB0915cEc44827D3",
    deployer,
  );

  const wg = await ap.getWETHGateway();

  const contractsToAllow = [
    wg,
    contractsByNetwork.Goerli.LIDO_STETH_GATEWAY,
    contractsByNetwork.Goerli.CURVE_STETH_GATEWAY,
  ];

  await waitForTransaction(safeWETH.addWithdrawers(contractsToAllow));
}

allowWETH()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
