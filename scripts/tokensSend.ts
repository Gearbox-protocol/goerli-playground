// @ts-ignore
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { BigNumber } from "ethers";
import { SupportedTokens, tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { ERC20Kovan__factory } from "../types";
import { waitForTransaction } from "../utils/transaction";
import { Logger } from "tslog";

const hre = require("hardhat");
const log: Logger = new Logger();

const tokensToDeploy: Array<SupportedTokens> = [
  //   "1INCH",
  //   "AAVE",
  //   "COMP",
  //   "CRV",
  //   "DPI",
  //   "FEI",
  //   "SUSHI",
  //   "UNI",
  // "LQTY",
  //   "WETH",
  //   "YFI",

  //   /// UPDATE
  //   "STETH",
  //   "FTM",
  //   "CVX",
  //   "FRAX",
  //   "FXS",
  // "LDO",
  // "SPELL",
  // "LUSD",
  "sUSD",
  "USDC",
  "USDT",
  "DAI",
  // "GUSD",
  // "LUNA",
];

const addressToSend = "0x53829d517D8fA7D59d3D40E20251e519C079985F";

async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];

  const chainId = await deployer.getChainId();
  if (chainId !== 42) throw new Error("Switch to Kovan network");

  for (let t of tokensToDeploy) {
    const tokenAddr = tokenDataByNetwork.Kovan[t];

    const token = ERC20Kovan__factory.connect(tokenAddr, deployer);
    const decimals = await token.decimals();

    log.info(`Sending ${t}`);
    await waitForTransaction(
      token.mint(addressToSend, BigNumber.from(10).pow(decimals + 8))
    );
  }
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
