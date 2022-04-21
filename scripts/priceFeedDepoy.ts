// @ts-ignore
import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { providers } from "ethers";
import {
  OracleType,
  priceFeedsByNetwork,
  SupportedTokens,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { deploy } from "../utils/transaction";
import { Logger } from "tslog";
import { ChainlinkPriceFeed, ChainlinkPriceFeed__factory } from "../types";

const hre = require("hardhat");
const log: Logger = new Logger();
const syncer = "0xC6493381d29e813D56063A1AffBbbC534fdCd70b";

async function deployPF(provider: providers.JsonRpcProvider, addr: string) {
  const mainnetPF = ChainlinkPriceFeed__factory.connect(addr, provider);

  const decimals = await mainnetPF.decimals();
  const newToken = await deploy<ChainlinkPriceFeed>(
    "ChainlinkPriceFeed",
    log,
    syncer,
    decimals,
    addr
  );

  await newToken.deployTransaction.wait(10);

  await hre.run("verify:verify", {
    address: newToken.address,
    constructorArguments: [syncer, decimals, addr],
  });
}

async function deployPriceFeeds() {
  dotenv.config({ path: ".env.local" });

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);

  const addr = [];

  for (let [sym, pf] of Object.entries(priceFeedsByNetwork)) {
    if (
      pf.priceFeedETH &&
      pf.priceFeedETH.type === OracleType.CHAINLINK_ORACLE &&
      !pf.priceFeedETH.kovan
    ) {
      const pfAddr = pf.priceFeedETH.address;
      log.info(`Deploying pricefeed ${sym}/ETH for oracle: ${pfAddr}`);
      await deployPF(mainnetProvider, pfAddr);
      addr.push(pfAddr);
      log.debug(`Deplyed at: ${pfAddr}`);
    }

    if (
      pf.priceFeedETH &&
      pf.priceFeedETH.type === OracleType.CHAINLINK_ORACLE &&
      pf.priceFeedETH.kovan
    ) {
      const pfAddr = pf.priceFeedETH.kovan;
      const pfeed = ChainlinkPriceFeed__factory.connect(pfAddr, deployer);
      try {
        await pfeed.mainnetOracle();
        addr.push(pfAddr);
      } catch (e) {}
    }

    if (
      pf.priceFeedUSD &&
      pf.priceFeedUSD.type === OracleType.CHAINLINK_ORACLE &&
      !pf.priceFeedUSD.kovan
    ) {
      const pfAddr = pf.priceFeedUSD.address;
      log.info(`Deploying pricefeed ${sym}/USD for oracle: ${pfAddr}`);
      await deployPF(mainnetProvider, pfAddr);
      addr.push(pfAddr);
      log.debug(`Deplyed at: ${pfAddr}`);
    }


    if (
      pf.priceFeedUSD &&
      pf.priceFeedUSD.type === OracleType.CHAINLINK_ORACLE &&
      pf.priceFeedUSD.kovan
    ) {
      const pfAddr = pf.priceFeedUSD.kovan;
      const pfeed = ChainlinkPriceFeed__factory.connect(pfAddr, deployer);
      try {
        await pfeed.mainnetOracle();
        addr.push(pfAddr);
      } catch (e) {}
    }

  }

  console.log(addr);
}

deployPriceFeeds()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
