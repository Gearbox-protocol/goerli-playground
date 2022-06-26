// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import {
  Curve3PoolMock,
  CurveGUSDMock,
  CurveMetapoolMock,
  CurveStETHMock,
  CurveSUSDMock,
  CurveSUSDDeposit,
  CurveToken,
} from "../types";
import { Verifier, deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { SYNCER } from "./constants";
import { tokenDataByNetwork } from "@gearbox-protocol/sdk";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

async function deployCurve() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();
  const verifier: Verifier = new Verifier();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  ///
  /// 3POOL DEPLOYMENT
  ///

  let coins = [
    tokenDataByNetwork.Kovan.DAI,
    tokenDataByNetwork.Kovan.USDC,
    tokenDataByNetwork.Kovan.USDT,
  ];

  let tokenConstructorArgs = ["Curve DAI/USDC/USDT LP Token", "3Crv", 18];

  const _3pool_token = await deploy<CurveToken>(
    "CurveToken",
    log,
    ...tokenConstructorArgs
  );

  let poolConstructorArgs = [
    SYNCER,
    deployer.address,
    coins,
    _3pool_token.address,
    2000,
    1000000,
    5000000000,
  ];

  const _3pool = await deploy<Curve3PoolMock>(
    "Curve3PoolMock",
    log,
    ...poolConstructorArgs
  );

  //   verifier.addContract({
  //       address: _3pool_token.address,
  //       constructorArguments: tokenConstructorArgs
  //   })

  //   verifier.addContract({
  //       address: _3pool.address,
  //       constructorArguments: poolConstructorArgs
  //   })

  await waitForTransaction(_3pool_token.set_minter(_3pool.address));

  log.info(`3pool token mock was deployed at at ${_3pool_token.address}`);
  log.info(`3pool mock was deployed at at ${_3pool.address}`);

  ///
  /// STECRV DEPLOYMENT
  ///

  coins = [ETH_ADDRESS, tokenDataByNetwork.Kovan.STETH];

  tokenConstructorArgs = ["Curve STETH/ETH LP Token", "steCRV", 18];

  const steCRV_token = await deploy<CurveToken>(
    "CurveToken",
    log,
    ...tokenConstructorArgs
  );

  poolConstructorArgs = [
    SYNCER,
    deployer.address,
    coins,
    steCRV_token.address,
    50,
    4000000,
    5000000000,
  ];

  const steCRV = await deploy<CurveStETHMock>(
    "CurveStETHMock",
    log,
    ...poolConstructorArgs
  );

  //   verifier.addContract({
  //     address: steCRV_token.address,
  //     constructorArguments: tokenConstructorArgs,
  //   });

  //   verifier.addContract({
  //     address: steCRV.address,
  //     constructorArguments: poolConstructorArgs,
  //   });

  await waitForTransaction(steCRV_token.set_minter(steCRV.address));

  log.info(`steCRV token mock was deployed at at ${steCRV_token.address}`);
  log.info(`steCRV mock was deployed at at ${steCRV.address}`);

  ///
  /// CURVE SUSD DEPLOYMENT
  ///

  coins = [
    tokenDataByNetwork.Kovan.DAI,
    tokenDataByNetwork.Kovan.USDC,
    tokenDataByNetwork.Kovan.USDT,
    tokenDataByNetwork.Kovan.sUSD,
  ];

  tokenConstructorArgs = ["Curve DAI/USDC/USDC/SUSD LP Token", "sCRV", 18];

  const sCRV_token = await deploy<CurveToken>(
    "CurveToken",
    log,
    ...tokenConstructorArgs
  );

  poolConstructorArgs = [
    SYNCER,
    coins,
    coins,
    sCRV_token.address,
    100,
    4000000,
  ];

  const sCRV = await deploy<CurveSUSDMock>(
    "CurveSUSDMock",
    log,
    ...poolConstructorArgs
  );

  let depositConstructorArgs = [coins, coins, sCRV.address, sCRV_token.address];

  const sCRV_deposit = await deploy<CurveSUSDDeposit>(
    "CurveSUSDDeposit",
    log,
    ...depositConstructorArgs
  );

  //   verifier.addContract({
  //     address: sCRV_token.address,
  //     constructorArguments: tokenConstructorArgs,
  //   });

  //   verifier.addContract({
  //     address: sCRV.address,
  //     constructorArguments: poolConstructorArgs,
  //   });

  //   verifier.addContract({
  //     address: sCRV_deposit.address,
  //     constructorArguments: depositConstructorArgs,
  //   });

  await waitForTransaction(sCRV_token.set_minter(sCRV.address));

  log.info(`Curve SUSD token mock was deployed at at ${sCRV_token.address}`);
  log.info(`Curve SUSD mock was deployed at at ${sCRV.address}`);

  ///
  /// CURVE GUSD3CRV DEPLOYMENT
  ///

  coins = [tokenDataByNetwork.Kovan.GUSD, _3pool_token.address];

  tokenConstructorArgs = ["gusd3CRV Token", "gusd3CRV", 18];

  const gusd_token = await deploy<CurveToken>(
    "CurveToken",
    log,
    ...tokenConstructorArgs
  );

  poolConstructorArgs = [
    SYNCER,
    deployer.address,
    coins,
    gusd_token.address,
    _3pool.address,
    1000,
    4000000,
    5000000000,
  ];

  const gusd = await deploy<CurveGUSDMock>(
    "CurveGUSDMock",
    log,
    ...poolConstructorArgs
  );

  //   verifier.addContract({
  //     address: gusd_token.address,
  //     constructorArguments: tokenConstructorArgs,
  //   });

  //   verifier.addContract({
  //     address: gusd.address,
  //     constructorArguments: poolConstructorArgs,
  //   });

  await waitForTransaction(gusd_token.set_minter(gusd.address));

  log.info(
    `Curve gusd3CRV token mock was deployed at at ${gusd_token.address}`
  );
  log.info(`Curve gusd3CRV mock was deployed at at ${gusd.address}`);

  ///
  /// CURVE FRAX3CRV DEPLOYMENT
  ///

  coins = [tokenDataByNetwork.Kovan.FRAX, _3pool_token.address];

  poolConstructorArgs = [
    SYNCER,
    "Frax",
    "FRAX",
    coins[0],
    18,
    1500,
    4000000,
    deployer.address,
    _3pool.address,
    coins[1],
  ];

  const frax3crv = await deploy<CurveMetapoolMock>(
    "CurveMetapoolMock",
    log,
    ...poolConstructorArgs
  );

  //   verifier.addContract({
  //     address: frax3crv.address,
  //     constructorArguments: poolConstructorArgs,
  //   });

  log.info(
    `Curve FRAX3CRV mock (implements ERC20) was deployed at at ${frax3crv.address}`
  );

  ///
  /// CURVE LUSD3CRV DEPLOYMENT
  ///

  coins = [tokenDataByNetwork.Kovan.LUSD, _3pool_token.address];

  poolConstructorArgs = [
    SYNCER,
    "LUSD",
    "",
    coins[0],
    18,
    1500,
    4000000,
    deployer.address,
    _3pool.address,
    coins[1],
  ];

  const lusd3crv = await deploy<CurveMetapoolMock>(
    "CurveMetapoolMock",
    log,
    ...poolConstructorArgs
  );

  //   verifier.addContract({
  //     address: lusd3crv.address,
  //     constructorArguments: poolConstructorArgs,
  //   });

  log.info(
    `Curve LUSD3CRV mock (implements ERC20) was deployed at at ${lusd3crv.address}`
  );
}

deployCurve()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
