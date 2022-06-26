// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import {
  Curve3PoolMock__factory,
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

const USDC_UNIT = BigNumber.from(10 ** 6);
const GUSD_UNIT = BigNumber.from(10 ** 2);

async function seedCurveTokens() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

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
  // Seed 3Pool
  //

  const _3poolAddress = contractsByNetwork.Kovan.CURVE_3CRV_POOL;

  await waitForTransaction(dai.mint(_3poolAddress, WAD.mul(10 ** 9)));
  await waitForTransaction(usdc.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(usdt.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));

  await waitForTransaction(dai.mint(deployer.address, WAD.mul(10 ** 7)));
  await waitForTransaction(usdc.mint(deployer.address, USDC_UNIT.mul(10 ** 7)));
  await waitForTransaction(usdt.mint(deployer.address, USDC_UNIT.mul(10 ** 7)));

  const _3pool = Curve3PoolMock__factory.connect(_3poolAddress, deployer);

  // Adding initial liquidity to 3Pool in order to seed metapools

  await waitForTransaction(dai.approve(_3poolAddress, MAX_INT));
  await waitForTransaction(usdc.approve(_3poolAddress, MAX_INT));
  await waitForTransaction(usdt.approve(_3poolAddress, MAX_INT));

  await waitForTransaction(
    _3pool.add_liquidity(
      [WAD.mul(10 ** 7), USDC_UNIT.mul(10 ** 7), USDC_UNIT.mul(10 ** 7)],
      0
    )
  );

  //
  // Seeding SUSD
  //

  const sCRV_address = contractsByNetwork.Kovan.CURVE_SUSD_POOL;

  // No transactions are dependent on those mints, so we can fire them into mempool async
  await waitForTransaction(dai.mint(sCRV_address, WAD.mul(10 ** 9)));
  await waitForTransaction(usdc.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(usdt.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(susd.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));

  //
  // Seeding steCRV
  //

  const gateway_params = contractParams.CURVE_STETH_GATEWAY;

  if (gateway_params.type != AdapterInterface.CURVE_V1_STECRV_POOL) {
    throw "Incorrect stETH type";
  }

  const steCRV_address = gateway_params.pool.Kovan;

  const steCRV = CurveStETHMock__factory.connect(steCRV_address, deployer);

  await waitForTransaction(steth.mint(steCRV_address, WAD.mul(1500)));
  await waitForTransaction(steCRV.donate_eth({ value: WAD.mul(1500) }));

  //
  // Seeding gusd3CRV
  //

  const gusd3CRVAddress = contractsByNetwork.Kovan.CURVE_GUSD_POOL;

  await waitForTransaction(gusd.mint(gusd3CRVAddress, GUSD_UNIT.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(gusd3CRVAddress, WAD.mul(10 ** 6)));

  //
  // Seeding frax3CRV
  //

  const frax3CRVAddress = contractsByNetwork.Kovan.CURVE_FRAX_POOL;

  await waitForTransaction(frax.mint(frax3CRVAddress, WAD.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(frax3CRVAddress, WAD.mul(10 ** 6)));

  //
  // Seeding gusd3CRV
  //

  const lusd3CRVAddress = contractsByNetwork.Kovan.CURVE_LUSD_POOL;

  await waitForTransaction(lusd.mint(lusd3CRVAddress, WAD.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(lusd3CRVAddress, WAD.mul(10 ** 6)));
}

seedCurveTokens()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
