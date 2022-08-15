import {
  AddressProvider__factory,
  DataCompressor__factory,
  ERC20__factory
} from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
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
  if (chainId !== 42) throw new Error("Switch to test network");

  const dc = DataCompressor__factory.connect(
    await addressProvider.getDataCompressor(),
    deployer
  );

  const pools = await dc.getPoolsList();

  for (let p of pools) {
    const { addr, underlying, dieselToken } = p;
    const token = ERC20__factory.connect(underlying, deployer);
    const sym = await token.symbol();
    console.log(`${sym}: `);
    console.log(`addr: ${addr} `);
    console.log(`diesel: ${dieselToken} `);
  }
}

deployTokens()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
