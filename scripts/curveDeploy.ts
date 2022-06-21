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
    CurveToken,
    ERC20Kovan__factory,
    CurveStETHMock__factory,
    CurveToken__factory
} from "../types";
import { Verifier, deploy } from "@gearbox-protocol/devops";
import { SYNCER } from "./constants";
import {
  ERC20__factory,
  RAY,
  tokenDataByNetwork,
  WAD,
} from "@gearbox-protocol/sdk";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const seedCoins = async function(coins: string[], poolAddress: string, signer: SignerWithAddress) {
    for (let coin of coins) {
        if (coin == ETH_ADDRESS) {
            let pool = CurveStETHMock__factory.connect(poolAddress, signer)
            await pool.donate_eth({value: WAD.mul(100)})
        } else {
            let token = ERC20Kovan__factory.connect(coin, signer);
            await token.mint(poolAddress, RAY)
        }
    }
}

const seedCoinsMetapool = async function(coin0_addr: string, _3crv_addr: string, poolAddress: string, signer: SignerWithAddress) {
    let token = ERC20Kovan__factory.connect(coin0_addr, signer);
    await token.mint(poolAddress, RAY);

    let _3crv = CurveToken__factory.connect(_3crv_addr, signer);
    await _3crv.mint(poolAddress, RAY);
}

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
      tokenDataByNetwork.Kovan.USDT
  ]

  let tokenConstructorArgs = [
      SYNCER,
      "Curve DAI/USDC/USDT LP Token",
      "3Crv",
      18,
      RAY
  ]

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
      5000000000
  ]

  const _3pool = await deploy<Curve3PoolMock>(
      "Curve3PoolMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: _3pool_token.address,
      constructorArguments: tokenConstructorArgs
  })

  verifier.addContract({
      address: _3pool.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoins(coins, _3pool.address, deployer);

  log.info(`3pool token mock was deployed at at ${_3pool_token.address}`);
  log.info(`3pool mock was deployed at at ${_3pool.address}`);

  ///
  /// STECRV DEPLOYMENT
  ///

  coins = [
      ETH_ADDRESS,
      tokenDataByNetwork.Kovan.STETH
  ]

  tokenConstructorArgs = [
      SYNCER,
      "Curve STETH/ETH LP Token",
      "steCRV",
      18,
      RAY
  ]

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
      5000000000
  ]

  const steCRV = await deploy<CurveStETHMock>(
      "CurveStETHMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: steCRV_token.address,
      constructorArguments: tokenConstructorArgs
  })

  verifier.addContract({
      address: steCRV.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoins(coins, steCRV.address, deployer);

  await steCRV_token.set_minter(steCRV.address);

  log.info(`steCRV token mock was deployed at at ${steCRV_token.address}`);
  log.info(`steCRV mock was deployed at at ${steCRV.address}`);

  ///
  /// CURVE SUSD DEPLOYMENT
  ///

  coins = [
      tokenDataByNetwork.Kovan.DAI,
      tokenDataByNetwork.Kovan.USDC,
      tokenDataByNetwork.Kovan.USDT,
      tokenDataByNetwork.Kovan.sUSD
  ]

  tokenConstructorArgs = [
      SYNCER,
      "Curve DAI/USDC/USDC/SUSD LP Token",
      "sCRV",
      18,
      RAY
  ]

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
      4000000
  ]

  const sCRV = await deploy<CurveSUSDMock>(
      "CurveSUSDMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: sCRV_token.address,
      constructorArguments: tokenConstructorArgs
  })

  verifier.addContract({
      address: sCRV.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoins(coins, sCRV.address, deployer)

  await sCRV_token.set_minter(sCRV.address);

  log.info(`Curve SUSD token mock was deployed at at ${sCRV_token.address}`);
  log.info(`Curve SUSD mock was deployed at at ${sCRV.address}`);

  ///
  /// CURVE GUSD3CRV DEPLOYMENT
  ///

  coins = [
      tokenDataByNetwork.Kovan.GUSD,
      _3pool_token.address
  ]

  tokenConstructorArgs = [
      SYNCER,
      "gusd3CRV Token",
      "gusd3CRV",
      18,
      RAY
  ]

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
      5000000000
  ]

  const gusd = await deploy<CurveGUSDMock>(
      "CurveGUSDMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: gusd_token.address,
      constructorArguments: tokenConstructorArgs
  })

  verifier.addContract({
      address: gusd.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoinsMetapool(coins[0], coins[1], gusd.address, deployer);

  await gusd_token.set_minter(gusd.address);

  log.info(`Curve gusd3CRV token mock was deployed at at ${gusd_token.address}`);
  log.info(`Curve gusd3CRV mock was deployed at at ${gusd.address}`);

  ///
  /// CURVE FRAX3CRV DEPLOYMENT
  ///

  coins = [
      tokenDataByNetwork.Kovan.FRAX,
      _3pool_token.address
  ]

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
      coins[1]
  ]

  const frax3crv = await deploy<CurveMetapoolMock>(
      "CurveMetapoolMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: frax3crv.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoinsMetapool(coins[0], coins[1], frax3crv.address, deployer);

  log.info(`Curve FRAX3CRV mock (implements ERC20) was deployed at at ${frax3crv.address}`);

  ///
  /// CURVE LUSD3CRV DEPLOYMENT
  ///

  coins = [
      tokenDataByNetwork.Kovan.LUSD,
      _3pool_token.address
  ]

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
      coins[1]
  ]

  const lusd3crv = await deploy<CurveMetapoolMock>(
      "CurveMetapoolMock",
      log,
      ...poolConstructorArgs
  );

  verifier.addContract({
      address: lusd3crv.address,
      constructorArguments: poolConstructorArgs
  })

  //await seedCoinsMetapool(coins[0], coins[1], lusd3crv.address, deployer);

  log.info(`Curve LUSD3CRV mock (implements ERC20) was deployed at at ${lusd3crv.address}`);

  await _3pool_token.set_minter(_3pool.address)

}

deployCurve()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
