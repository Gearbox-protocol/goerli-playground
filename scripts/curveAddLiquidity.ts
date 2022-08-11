import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  AdapterInterface,
  contractParams,
  contractsByNetwork,
  MAX_INT,
  tokenDataByNetwork,
  WAD,
} from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { Logger } from "tslog";

import config from "../config";
import {
  CurveGUSDMock__factory,
  CurveMetapoolMock__factory,
  CurveStETHMock__factory,
  CurveSUSDMock__factory,
  CurveToken__factory,
  ERC20Kovan__factory,
  Lido__factory,
} from "../types";
import setupScriptRuntime from "../utils/setupScriptRuntime";

async function seedCurveTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const { deployer } = await setupScriptRuntime();
  //
  // Define tokens
  //

  const dai = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].DAI,
    deployer
  );

  const usdc = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].USDC,
    deployer
  );

  const usdt = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].USDT,
    deployer
  );

  const susd = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].sUSD,
    deployer
  );

  const gusd = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].GUSD,
    deployer
  );

  const frax = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].FRAX,
    deployer
  );

  const lusd = ERC20Kovan__factory.connect(
    tokenDataByNetwork[config.network].LUSD,
    deployer
  );

  const _3crv = CurveToken__factory.connect(
    tokenDataByNetwork[config.network]["3Crv"],
    deployer
  );

  const steth = Lido__factory.connect(
    tokenDataByNetwork[config.network].STETH,
    deployer
  );

  //
  // Adding liquidity to steCRV
  //

  log.info("Adding liquidity to steCRV");

  const gatewayParams = contractParams.CURVE_STETH_GATEWAY;

  if (gatewayParams.type !== AdapterInterface.CURVE_V1_STECRV_POOL) {
    throw new Error("Incorrect stETH type");
  }

  const steCRVAddress = gatewayParams.pool[config.network];

  const steCRV = CurveStETHMock__factory.connect(steCRVAddress, deployer);

  log.info("Approving stETH");

  await waitForTransaction(steth.approve(steCRVAddress, MAX_INT));
  await waitForTransaction(steth.mint(deployer.address, WAD));

  log.info("Adding liquidity to steCRV");

  await waitForTransaction(steCRV.add_liquidity([WAD, WAD], 0, { value: WAD }));

  log.info(
    `ETH balance: ${await steCRV.balances(
      0
    )}, stETH balance: ${await steCRV.balances(1)}`
  );

  //
  // Seeding SUSD
  //

  log.info("Adding liquidity to SUSD pool");

  const sCRVAddress = contractsByNetwork[config.network].CURVE_SUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(dai.approve(sCRVAddress, MAX_INT));
  await waitForTransaction(usdc.approve(sCRVAddress, MAX_INT));
  await waitForTransaction(usdt.approve(sCRVAddress, MAX_INT));
  await waitForTransaction(susd.approve(sCRVAddress, MAX_INT));

  log.info("Adding liquidity to SUSD");

  const sCRV = CurveSUSDMock__factory.connect(sCRVAddress, deployer);

  await waitForTransaction(sCRV.add_liquidity([WAD, 10 ** 6, 10 ** 6, WAD], 0));

  log.info(
    `DAI balance: ${await sCRV.balances(0)},
  USDC balance: ${await sCRV.balances(1)},
  USDT balance: ${await sCRV.balances(2)},
  SUSD balance: ${await sCRV.balances(3)}`
  );

  //
  // Seeding GUSD
  //

  log.info("Adding liquidity to GUSD pool");

  const gusdAddress = contractsByNetwork[config.network].CURVE_GUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(gusd.approve(gusdAddress, MAX_INT));
  await waitForTransaction(_3crv.approve(gusdAddress, MAX_INT));

  log.info("Adding liquidity to GUSD");

  const gusdPool = CurveGUSDMock__factory.connect(gusdAddress, deployer);

  await waitForTransaction(gusdPool.add_liquidity([10 ** 2, WAD], 0));

  log.info(
    `GUSD balance: ${await gusdPool.balances(0)},
     3CRV balance: ${await gusdPool.balances(1)}`
  );

  //
  // Seeding FRAX
  //

  log.info("Adding liquidity to FRAX3CRV pool");

  const frax3crvAddress = contractsByNetwork[config.network].CURVE_FRAX_POOL;

  log.info("Approving tokens");

  await waitForTransaction(frax.approve(frax3crvAddress, MAX_INT));
  await waitForTransaction(_3crv.approve(frax3crvAddress, MAX_INT));

  log.info("Adding liquidity to FRAX3CRV");

  const frax3crv = CurveMetapoolMock__factory.connect(
    frax3crvAddress,
    deployer
  );

  await waitForTransaction(
    frax3crv["add_liquidity(uint256[2],uint256)"]([WAD, WAD], 0)
  );

  log.info(
    `FRAX balance: ${await frax3crv.balances(0)},
  3CRV balance: ${await frax3crv.balances(1)}`
  );

  //
  // Seeding LUSD
  //

  log.info("Adding liquidity to LUSD3CRV pool");

  const lusd3crvAddress = contractsByNetwork[config.network].CURVE_LUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(lusd.approve(lusd3crvAddress, MAX_INT));
  await waitForTransaction(_3crv.approve(lusd3crvAddress, MAX_INT));

  log.info("Adding liquidity to LUSD3CRV");

  const lusd3crv = CurveMetapoolMock__factory.connect(
    lusd3crvAddress,
    deployer
  );

  await waitForTransaction(
    lusd3crv["add_liquidity(uint256[2],uint256)"]([WAD, WAD], 0)
  );

  log.info(
    `LUSD balance: ${await frax3crv.balances(0)},
  3CRV balance: ${await frax3crv.balances(1)}`
  );
}

seedCurveTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
