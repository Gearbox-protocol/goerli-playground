// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import {
  Curve3PoolMock__factory,
  CurveSUSDMock__factory,
  CurveMetapoolMock__factory,
  CurveGUSDMock__factory,
  ERC20Kovan__factory,
  CurveStETHMock__factory,
  CurveToken__factory,
  Lido__factory,
} from "../types";
import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  tokenDataByNetwork,
  contractsByNetwork,
  contractParams,
  WAD,
  MAX_INT,
  AdapterInterface,
} from "@gearbox-protocol/sdk";
import { BigNumber } from "ethers";

const hre = require("hardhat");

const KOVAN_ROOT = "0x19301B8e700925E850C945a28256b6A6FDe5904C";

async function seedCurveTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  let deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  if (chainId === 1337) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [KOVAN_ROOT],
    });

    deployer = await ethers.getSigner(KOVAN_ROOT);
  }
  //
  // Define tokens
  //

  const dai = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.DAI,
    deployer
  );

  const usdc = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.USDC,
    deployer
  );

  const usdt = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.USDT,
    deployer
  );

  const susd = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.sUSD,
    deployer
  );

  const gusd = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.GUSD,
    deployer
  );

  const frax = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.FRAX,
    deployer
  );

  const lusd = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.LUSD,
    deployer
  );

  const _3crv = CurveToken__factory.connect(
    tokenDataByNetwork.Kovan["3Crv"],
    deployer
  );

  const steth = Lido__factory.connect(tokenDataByNetwork.Kovan.STETH, deployer);

  //
  // Adding liquidity to steCRV
  //

  log.info("Adding liquidity to steCRV");

  const gateway_params = contractParams.CURVE_STETH_GATEWAY;

  if (gateway_params.type != AdapterInterface.CURVE_V1_STECRV_POOL) {
    throw "Incorrect stETH type";
  }

  const steCRV_address = gateway_params.pool.Kovan;

  const steCRV = CurveStETHMock__factory.connect(steCRV_address, deployer);

  log.info("Approving stETH");

  await waitForTransaction(steth.approve(steCRV_address, MAX_INT));
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

  const sCRV_address = contractsByNetwork.Kovan.CURVE_SUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(dai.approve(sCRV_address, MAX_INT));
  await waitForTransaction(usdc.approve(sCRV_address, MAX_INT));
  await waitForTransaction(usdt.approve(sCRV_address, MAX_INT));
  await waitForTransaction(susd.approve(sCRV_address, MAX_INT));

  log.info("Adding liquidity to SUSD");

  const sCRV = CurveSUSDMock__factory.connect(sCRV_address, deployer);

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

  const gusd_address = contractsByNetwork.Kovan.CURVE_GUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(gusd.approve(gusd_address, MAX_INT));
  await waitForTransaction(_3crv.approve(gusd_address, MAX_INT));

  log.info("Adding liquidity to GUSD");

  const gusd_pool = CurveGUSDMock__factory.connect(gusd_address, deployer);

  await waitForTransaction(gusd_pool.add_liquidity([10 ** 2, WAD], 0));

  log.info(
    `GUSD balance: ${await gusd_pool.balances(0)},
  3CRV balance: ${await gusd_pool.balances(1)}`
  );

  //
  // Seeding FRAX
  //

  log.info("Adding liquidity to FRAX3CRV pool");

  const frax3crv_address = contractsByNetwork.Kovan.CURVE_FRAX_POOL;

  log.info("Approving tokens");

  await waitForTransaction(frax.approve(frax3crv_address, MAX_INT));
  await waitForTransaction(_3crv.approve(frax3crv_address, MAX_INT));

  log.info("Adding liquidity to FRAX3CRV");

  const frax3crv = CurveMetapoolMock__factory.connect(
    frax3crv_address,
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

  const lusd3crv_address = contractsByNetwork.Kovan.CURVE_LUSD_POOL;

  log.info("Approving tokens");

  await waitForTransaction(lusd.approve(lusd3crv_address, MAX_INT));
  await waitForTransaction(_3crv.approve(lusd3crv_address, MAX_INT));

  log.info("Adding liquidity to LUSD3CRV");

  const lusd3crv = CurveMetapoolMock__factory.connect(
    lusd3crv_address,
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
