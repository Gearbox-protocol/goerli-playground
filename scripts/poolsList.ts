// @ts-ignore
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import {
  AddressProvider__factory,
  DataCompressor__factory,
  ERC20__factory,
  SupportedTokens,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { Logger } from "tslog";

async function deployTokens() {
  dotenv.config({ path: ".env.kovan" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];

  const addressProvider = AddressProvider__factory.connect(
    process.env.REACT_APP_ADDRESS_PROVIDER || "",
    deployer
  );

  const chainId = await deployer.getChainId();
  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const dc = DataCompressor__factory.connect(
    await addressProvider.getDataCompressor(),
    deployer
  );

  const pools = await dc.getPoolsList();

  for (let p of pools) {
    const { addr, underlyingToken, dieselToken } = p;
    const token = ERC20__factory.connect(underlyingToken, deployer);
    const sym = await token.symbol();
    console.log(`${sym}: `);
    console.log(`addr: ${addr} `);
    console.log(`diesel: ${dieselToken} `);

  }
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
