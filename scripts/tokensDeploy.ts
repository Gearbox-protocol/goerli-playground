// @ts-ignore
import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { providers } from "ethers";
import { SupportedTokens, tokenDataByNetwork } from "@gearbox-protocol/sdk";

const tokensToDeploy : Array<SupportedTokens>= [
  "1INCH",
  "AAVE",
  "COMP",
  "CRV",
  "DPI",
  "FEI",
  "SUSHI",
  "UNI",
  "USDT",
  "WETH",
  "YFI",

  /// UPDATE
  "STETH",
  "FTM",
  "CVX",
  "FRAX",
  "FXS",
  "LDO",
  "SPELL",
  "LUSD",
  "SUSD",
  "GUSD",
  "LUNA",
];

async function deployTokens() {
  dotenv.config({ path: ".env.local" });
  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);

  for(let t of tokensToDeploy) {
      const mainnetAddress = tokenDataByNetwork.Mainnet[t];
      console.log(t, mainnetAddress);
  }   

}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
