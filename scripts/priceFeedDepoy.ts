import {
  LOCAL_NETWORK,
  OracleType,
  priceFeedsByNetwork,
} from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { providers } from "ethers";
import { run } from "hardhat";
import { Logger } from "tslog";
import config from "../config";
import { ChainlinkPriceFeed, ChainlinkPriceFeed__factory } from "../types";
import setupScriptRuntime from "../utils/setupScriptRuntime";
import { deploy } from "../utils/transaction";

const log: Logger = new Logger();

async function deployPF(provider: providers.JsonRpcProvider, addr: string) {
  const mainnetPF = ChainlinkPriceFeed__factory.connect(addr, provider);

  const decimals = await mainnetPF.decimals();
  const newToken = await deploy<ChainlinkPriceFeed>(
    "ChainlinkPriceFeed",
    log,
    config.syncer,
    decimals,
    addr
  );

  await newToken.deployTransaction.wait(config.confirmations);

  if (config.chainId !== LOCAL_NETWORK) {
    await run("verify:verify", {
      address: newToken.address,
      constructorArguments: [config.syncer, decimals, addr],
    });
  }
}

async function deployPriceFeeds() {
  dotenv.config({ path: ".env.local" });

  const { mainnetProvider, deployer } = await setupScriptRuntime();

  const addr = [];
  const deployed: Record<string, string> = {};

  for (const [sym, pf] of Object.entries(priceFeedsByNetwork)) {
    if (config.skipPriceFeedsFor?.includes(sym)) {
      log.debug(`Skipped ${sym}`);
      continue;
    }
    if (
      pf.priceFeedETH &&
      pf.priceFeedETH.type === OracleType.CHAINLINK_ORACLE &&
      !pf.priceFeedETH.address[config.network]
    ) {
      const pfAddr = pf.priceFeedETH.address.Mainnet;
      log.info(`Deploying pricefeed ${sym}/ETH for oracle: ${pfAddr}`);
      await deployPF(mainnetProvider, pfAddr);
      addr.push(pfAddr);
      log.debug(`Deplyed at: ${pfAddr}`);
      deployed[`${sym}/ETH`] = pfAddr;
    }

    if (
      pf.priceFeedETH &&
      pf.priceFeedETH.type === OracleType.CHAINLINK_ORACLE &&
      pf.priceFeedETH.address[config.network]
    ) {
      const pfAddr = pf.priceFeedETH.address[config.network];
      const pfeed = ChainlinkPriceFeed__factory.connect(pfAddr, deployer);
      try {
        await pfeed.mainnetOracle();
        addr.push(pfAddr);
      } catch (e) {}
    }

    if (
      pf.priceFeedUSD &&
      pf.priceFeedUSD.type === OracleType.CHAINLINK_ORACLE &&
      !pf.priceFeedUSD.address[config.network]
    ) {
      const pfAddr = pf.priceFeedUSD.address.Mainnet;
      log.info(`Deploying pricefeed ${sym}/USD for oracle: ${pfAddr}`);
      await deployPF(mainnetProvider, pfAddr);
      addr.push(pfAddr);
      log.debug(`Deplyed at: ${pfAddr}`);
      deployed[`${sym}/USD`] = pfAddr;
    }

    if (
      pf.priceFeedUSD &&
      pf.priceFeedUSD.type === OracleType.CHAINLINK_ORACLE &&
      pf.priceFeedUSD.address[config.network]
    ) {
      const pfAddr = pf.priceFeedUSD.address[config.network];
      const pfeed = ChainlinkPriceFeed__factory.connect(pfAddr, deployer);
      try {
        await pfeed.mainnetOracle();
        addr.push(pfAddr);
      } catch (e) {}
    }
  }

  console.log(addr);
  console.log(deployed);
}

deployPriceFeeds()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
