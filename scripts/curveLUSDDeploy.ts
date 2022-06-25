// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import { CurveMetapoolMock } from "../types";
import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { SYNCER } from "./constants";
import { tokenDataByNetwork, contractsByNetwork } from "@gearbox-protocol/sdk";

async function deployCurve() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  ///
  /// CURVE LUSD3CRV DEPLOYMENT
  ///

  let coins = [tokenDataByNetwork.Kovan.LUSD, tokenDataByNetwork.Kovan["3Crv"]];

  let poolConstructorArgs = [
    SYNCER,
    "LUSD",
    "LUSD",
    coins[0],
    18,
    1500,
    4000000,
    deployer.address,
    contractsByNetwork.Kovan.CURVE_3CRV_POOL,
    coins[1],
  ];

  const lusd3crv = await deploy<CurveMetapoolMock>(
    "CurveMetapoolMock",
    log,
    ...poolConstructorArgs
  );

  log.info(
    `Curve LUSD3CRV mock (implements ERC20) was deployed at at ${lusd3crv.address}`
  );
}

deployCurve()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
