// @ts-ignore
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { BigNumber } from "ethers";
import { SupportedToken, tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { ERC20Kovan__factory } from "../types";
import { waitForTransaction } from "../utils/transaction";
import { Logger } from "tslog";
import config from "../config";

const hre = require("hardhat");
const log: Logger = new Logger();

const tokensToDeploy: Array<SupportedToken> = [
  // "1INCH",
  // "AAVE",
  // "COMP",
  // "CRV",
  // "DAI",
  // "DPI",
  // "FEI",
  // "LINK",
  // "SNX",
  // "SUSHI",
  // "UNI",
  "USDC",
  // "USDT",
  // "WBTC",
  // // "WETH",
  // "YFI",
  // "STETH",
  // "FTM",
  // "CVX",
  // "FRAX",
  // "FXS",
  // "LDO",
  // "SPELL",
  // "LUSD",
  // "sUSD",
  // "GUSD",
  // "LUNA",
  // "LQTY",
];

const addressToSend = "0x8002e5D8cA10e2b0e7d1bd98C367fE08FA555A71";

async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];

  const chainId = await deployer.getChainId();
  if (chainId !== 42) throw new Error("Switch to test network");

  for (const t of tokensToDeploy) {
    const tokenAddr = tokenDataByNetwork[config.network][t];

    const token = ERC20Kovan__factory.connect(tokenAddr, deployer);
    const decimals = await token.decimals();

    log.info(`Sending ${t} to ${addressToSend}`);

    const tx = await waitForTransaction(
      token.mint(addressToSend, BigNumber.from(10).pow(decimals).mul(100000))
    );

    console.log(
      `https://${config.network.toLowerCase()}.etherscan.io/tx/${
        tx.transactionHash
      }`
    );
  }
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
