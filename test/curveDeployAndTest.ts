// @ts-ignore
import { ethers } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { BigNumber } from "ethers";
import * as dotenv from "dotenv";
import { Logger } from "tslog";
import {
  Curve3PoolMock,
  CurveGUSDMock,
  CurveMetapoolMock,
  CurveStETHMock,
  CurveSUSDMock,
  CurveToken,
  ERC20Testnet,
  ERC20Testnet__factory,
  CurveStETHMock__factory,
  CurveSUSDDeposit,
} from "../types";
import { Verifier, deploy, expect } from "@gearbox-protocol/devops";
import {
  ERC20__factory,
  WAD,
  RAY,
  MAX_INT,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const USDC_UNIT = BigNumber.from(10 ** 6);
const GUSD_UNIT = BigNumber.from(10 ** 2);

const seedCoins = async function (
  coins: string[],
  poolAddress: string,
  signer: SignerWithAddress
) {
  for (let coin of coins) {
    if (coin == ETH_ADDRESS) {
      let pool = CurveStETHMock__factory.connect(poolAddress, signer);
      await pool.donate_eth({ value: WAD.mul(300) });
    } else {
      let token = ERC20Testnet__factory.connect(coin, signer);
      await token.mint(poolAddress, RAY);
    }
  }
};

describe("Curve mocks tests", async function () {
  this.timeout(0);

  let deployer: SignerWithAddress;
  let log: Logger;

  const deployToken = async function (name: string, decimals: number) {
    return await deploy<ERC20Testnet>(
      "ERC20Testnet",
      log,
      name,
      name,
      decimals
    );
  };

  beforeEach(async () => {
    log = new Logger();

    const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
    deployer = accounts[0];
  });

  it("Curve 3CRV mock test", async function () {
    const dai = await deployToken("DAI", 18);
    const usdc = await deployToken("USDC", 6);
    const usdt = await deployToken("USDT", 6);

    let coins = [dai.address, usdc.address, usdt.address];

    let tokenConstructorArgs = ["Curve DAI/USDC/USDT LP Token", "3Crv", 18];

    const _3pool_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    let poolConstructorArgs = [
      deployer.address,
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

    await seedCoins(coins, _3pool.address, deployer);

    await dai.approve(_3pool.address, MAX_INT);
    await usdc.approve(_3pool.address, MAX_INT);
    await usdt.approve(_3pool.address, MAX_INT);

    await _3pool_token.set_minter(_3pool.address);

    console.log("Syncing pool");
    await _3pool.sync_pool(WAD, 2000);

    console.log("Adding liquidity");
    await _3pool.add_liquidity(
      [WAD.mul(100), USDC_UNIT.mul(100), USDC_UNIT.mul(100)],
      0
    );

    expect(await _3pool.balances(0)).to.be.eq(WAD.mul(100));
    expect(await _3pool.balances(1)).to.be.eq(USDC_UNIT.mul(100));
    expect(await _3pool.balances(2)).to.be.eq(USDC_UNIT.mul(100));

    expect(await _3pool.get_virtual_price()).to.be.eq(WAD);

    await _3pool.sync_pool(WAD.mul(2), 2000);

    expect(await _3pool.balances(0)).to.be.eq(WAD.mul(200));
    expect(await _3pool.balances(1)).to.be.eq(USDC_UNIT.mul(200));
    expect(await _3pool.balances(2)).to.be.eq(USDC_UNIT.mul(200));

    expect(await _3pool.get_virtual_price()).to.be.eq(WAD.mul(2));

    let dai_balance_before = await dai.balanceOf(deployer.address);
    let usdc_balance_before = await usdc.balanceOf(deployer.address);

    console.log("Performing exchange");
    await _3pool.exchange(0, 1, WAD.div(100), USDC_UNIT.div(110));

    let dai_balance_after = await dai.balanceOf(deployer.address);
    let usdc_balance_after = await usdc.balanceOf(deployer.address);

    expect(dai_balance_before.sub(dai_balance_after)).to.be.eq(WAD.div(100));
    expect(usdc_balance_after.sub(usdc_balance_before)).to.be.gt(
      USDC_UNIT.div(110)
    );

    expect(await _3pool.balances(0)).to.be.eq(WAD.mul(200).add(WAD.div(100)));
    expect(await _3pool.balances(1)).to.be.lt(
      USDC_UNIT.mul(200).sub(USDC_UNIT.div(110))
    );
    expect(await _3pool.get_virtual_price()).to.be.gt(WAD.mul(2));

    dai_balance_before = await dai.balanceOf(deployer.address);
    usdc_balance_before = await usdc.balanceOf(deployer.address);
    let usdt_balance_before = await usdt.balanceOf(deployer.address);

    console.log("Removing liquidity");
    await _3pool.remove_liquidity(WAD.div(100), [
      WAD.div(330),
      USDC_UNIT.div(330),
      USDC_UNIT.div(330),
    ]);

    dai_balance_after = await dai.balanceOf(deployer.address);
    usdc_balance_after = await usdc.balanceOf(deployer.address);
    let usdt_balance_after = await usdt.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(WAD.div(330));
    expect(usdc_balance_after.sub(usdc_balance_before)).to.be.gt(
      USDC_UNIT.div(330)
    );
    expect(usdt_balance_after.sub(usdt_balance_before)).to.be.gt(
      USDC_UNIT.div(330)
    );

    dai_balance_before = await dai.balanceOf(deployer.address);
    usdc_balance_before = await usdc.balanceOf(deployer.address);
    usdt_balance_before = await usdt.balanceOf(deployer.address);

    console.log("Removing liquidity imbalanced");
    await _3pool.remove_liquidity_imbalance(
      [WAD, USDC_UNIT, USDC_UNIT.mul(2)],
      WAD.mul(9).div(2)
    );

    dai_balance_after = await dai.balanceOf(deployer.address);
    usdc_balance_after = await usdc.balanceOf(deployer.address);
    usdt_balance_after = await usdt.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.eq(WAD);
    expect(usdc_balance_after.sub(usdc_balance_before)).to.be.eq(USDC_UNIT);
    expect(usdt_balance_after.sub(usdt_balance_before)).to.be.eq(
      USDC_UNIT.mul(2)
    );

    dai_balance_before = await dai.balanceOf(deployer.address);

    console.log("Removing liquidity in one coin");
    await _3pool.remove_liquidity_one_coin(WAD.div(100), 0, WAD.div(110));

    dai_balance_after = await dai.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(WAD.div(110));

    console.log("Checking that liquidity calculation is correct");

    let lp_balance = await _3pool_token.balanceOf(deployer.address);

    await _3pool.remove_liquidity(lp_balance, [
      await _3pool.balances(0),
      await _3pool.balances(1),
      await _3pool.balances(2),
    ]);

    expect(await _3pool.balances(0)).to.be.eq(0);
    expect(await _3pool.balances(1)).to.be.eq(0);
    expect(await _3pool.balances(2)).to.be.eq(0);
  });

  it("Curve GUSD mock test", async function () {
    const dai = await deployToken("DAI", 18);
    const usdc = await deployToken("USDC", 6);
    const usdt = await deployToken("USDT", 6);

    let coins = [dai.address, usdc.address, usdt.address];

    let tokenConstructorArgs = ["Curve DAI/USDC/USDT LP Token", "3Crv", 18];

    const _3pool_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    let poolConstructorArgs = [
      deployer.address,
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

    await seedCoins(coins, _3pool.address, deployer);

    await dai.approve(_3pool.address, MAX_INT);
    await usdc.approve(_3pool.address, MAX_INT);
    await usdt.approve(_3pool.address, MAX_INT);

    await _3pool_token.set_minter(_3pool.address);

    console.log("Syncing 3CRV pool");
    await _3pool.sync_pool(WAD, 2000);

    console.log("Adding liquidity to 3CRV");
    await _3pool.add_liquidity(
      [WAD.mul(100000), USDC_UNIT.mul(100000), USDC_UNIT.mul(100000)],
      0
    );

    console.log("Deploying gusd3CRV pool");

    const gusd = await deployToken("GUSD", 2);

    coins = [gusd.address, _3pool_token.address];

    tokenConstructorArgs = ["gusd3CRV Token", "gusd3CRV", 18];

    const gusd3crv_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    poolConstructorArgs = [
      deployer.address,
      deployer.address,
      coins,
      gusd3crv_token.address,
      _3pool.address,
      1000,
      4000000,
      5000000000,
    ];

    const gusd3crv = await deploy<CurveGUSDMock>(
      "CurveGUSDMock",
      log,
      ...poolConstructorArgs
    );

    gusd3crv_token.set_minter(gusd3crv.address);

    console.log("Seeding gusd3Crv pool");
    await gusd.mint(gusd3crv.address, WAD.mul(10000));
    await _3pool_token.transfer(gusd3crv.address, WAD.mul(10000));

    await gusd.approve(gusd3crv.address, MAX_INT);
    await _3pool_token.approve(gusd3crv.address, MAX_INT);
    await dai.approve(gusd3crv.address, MAX_INT);

    console.log("Syncing gusd3Crv");
    await gusd3crv.sync_pool(WAD, 1000);

    console.log("Adding liquidity");
    await gusd3crv.add_liquidity(
      [GUSD_UNIT.mul(100), WAD.mul(100)],
      WAD.mul(199)
    );

    expect(await gusd3crv_token.balanceOf(deployer.address)).to.be.gt(
      WAD.mul(199)
    );

    expect(await gusd3crv.balances(0)).to.be.eq(GUSD_UNIT.mul(100));
    expect(await gusd3crv.balances(1)).to.be.eq(WAD.mul(100));

    expect(await gusd3crv.get_virtual_price()).to.be.eq(WAD);

    await gusd3crv.sync_pool(WAD.mul(2), 1000);

    expect(await gusd3crv.balances(0)).to.be.eq(GUSD_UNIT.mul(200));
    expect(await gusd3crv.balances(1)).to.be.eq(WAD.mul(200));

    expect(await gusd3crv.get_virtual_price()).to.be.eq(WAD.mul(2));

    console.log("Performing exchange");

    let gusd_balance_before = await gusd.balanceOf(deployer.address);
    let _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);

    await gusd3crv.exchange(0, 1, GUSD_UNIT, WAD.mul(9).div(10));

    let gusd_balance_after = await gusd.balanceOf(deployer.address);
    let _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);

    expect(gusd_balance_before.sub(gusd_balance_after)).to.be.eq(GUSD_UNIT);
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.gt(
      WAD.mul(9).div(10)
    );

    console.log("Performing exchange_underlying");

    gusd_balance_before = await gusd.balanceOf(deployer.address);
    let dai_balance_before = await dai.balanceOf(deployer.address);

    await gusd3crv.exchange_underlying(0, 1, GUSD_UNIT, WAD.mul(9).div(10));

    gusd_balance_after = await gusd.balanceOf(deployer.address);
    let dai_balance_after = await dai.balanceOf(deployer.address);

    expect(gusd_balance_before.sub(gusd_balance_after)).to.be.eq(GUSD_UNIT);
    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(
      WAD.mul(9).div(10)
    );

    console.log("Removing liquidity");

    let gusd3crv_balance_before = await gusd3crv_token.balanceOf(
      deployer.address
    );
    gusd_balance_before = await gusd.balanceOf(deployer.address);
    _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);

    await gusd3crv.remove_liquidity(WAD.div(100), [
      GUSD_UNIT.div(110),
      WAD.div(110),
    ]);

    let gusd3crv_balance_after = await gusd3crv_token.balanceOf(
      deployer.address
    );
    gusd_balance_after = await gusd.balanceOf(deployer.address);
    _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);

    expect(gusd_balance_after.sub(gusd_balance_before)).to.be.gt(
      GUSD_UNIT.div(110)
    );
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.gt(
      WAD.div(110)
    );
    expect(gusd3crv_balance_before.sub(gusd3crv_balance_after)).to.be.eq(
      WAD.div(100)
    );

    console.log("Removing liquidity imbalanced");

    gusd_balance_before = await gusd.balanceOf(deployer.address);
    _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);
    gusd3crv_balance_before = await gusd3crv_token.balanceOf(deployer.address);

    await gusd3crv.remove_liquidity_imbalance(
      [GUSD_UNIT, WAD.mul(2)],
      WAD.mul(7).div(4)
    );

    gusd_balance_after = await gusd.balanceOf(deployer.address);
    _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);
    gusd3crv_balance_after = await gusd3crv_token.balanceOf(deployer.address);

    expect(gusd_balance_after.sub(gusd_balance_before)).to.be.eq(GUSD_UNIT);
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.eq(WAD.mul(2));
    expect(gusd3crv_balance_before.sub(gusd3crv_balance_after)).to.be.lt(
      WAD.mul(7).div(4)
    );

    console.log("Removing liquidity one coin");

    gusd_balance_before = await gusd.balanceOf(deployer.address);
    gusd3crv_balance_before = await gusd3crv_token.balanceOf(deployer.address);

    await gusd3crv.remove_liquidity_one_coin(WAD, 0, GUSD_UNIT.mul(18).div(10));

    gusd_balance_after = await gusd.balanceOf(deployer.address);
    gusd3crv_balance_after = await gusd3crv_token.balanceOf(deployer.address);

    expect(gusd_balance_after.sub(gusd_balance_before)).to.be.gt(
      GUSD_UNIT.mul(18).div(10)
    );
    expect(gusd3crv_balance_before.sub(gusd3crv_balance_after)).to.be.eq(WAD);
  });

  it("Curve metapool mock test", async function () {
    const dai = await deployToken("DAI", 18);
    const usdc = await deployToken("USDC", 6);
    const usdt = await deployToken("USDT", 6);

    let coins = [dai.address, usdc.address, usdt.address];

    let tokenConstructorArgs = ["Curve DAI/USDC/USDT LP Token", "3Crv", 18];

    const _3pool_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    let poolConstructorArgs = [
      deployer.address,
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

    await seedCoins(coins, _3pool.address, deployer);

    await dai.approve(_3pool.address, MAX_INT);
    await usdc.approve(_3pool.address, MAX_INT);
    await usdt.approve(_3pool.address, MAX_INT);

    await _3pool_token.set_minter(_3pool.address);

    console.log("Syncing 3CRV pool");
    await _3pool.sync_pool(WAD, 2000);

    console.log("Adding liquidity to 3CRV");
    await _3pool.add_liquidity(
      [WAD.mul(100000), USDC_UNIT.mul(100000), USDC_UNIT.mul(100000)],
      0
    );

    console.log("Deploying frax3CRV pool");

    const frax = await deployToken("FRAX", 18);

    coins = [frax.address, _3pool_token.address];

    poolConstructorArgs = [
      deployer.address,
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

    console.log("Seeding frax3Crv pool");
    await frax.mint(frax3crv.address, WAD.mul(10000));
    await _3pool_token.transfer(frax3crv.address, WAD.mul(10000));

    await frax.approve(frax3crv.address, MAX_INT);
    await _3pool_token.approve(frax3crv.address, MAX_INT);
    await dai.approve(frax3crv.address, MAX_INT);

    console.log("Syncing frax3Crv");
    await frax3crv.sync_pool(WAD, 1000);

    await frax3crv["add_liquidity(uint256[2],uint256)"](
      [WAD.mul(100), WAD.mul(100)],
      WAD.mul(199)
    );

    expect(await frax3crv.balanceOf(deployer.address)).to.be.gt(WAD.mul(199));

    expect(await frax3crv.balances(0)).to.be.eq(WAD.mul(100));
    expect(await frax3crv.balances(1)).to.be.eq(WAD.mul(100));

    expect(await frax3crv.get_virtual_price()).to.be.eq(WAD);

    await frax3crv.sync_pool(WAD.mul(2), 1000);

    expect(await frax3crv.balances(0)).to.be.eq(WAD.mul(200));
    expect(await frax3crv.balances(1)).to.be.eq(WAD.mul(200));

    expect(await frax3crv.get_virtual_price()).to.be.eq(WAD.mul(2));

    console.log("Performing exchange");

    let frax_balance_before = await frax.balanceOf(deployer.address);
    let _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);

    await frax3crv["exchange(int128,int128,uint256,uint256)"](
      0,
      1,
      WAD,
      WAD.mul(9).div(10)
    );

    let frax_balance_after = await frax.balanceOf(deployer.address);
    let _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);

    expect(frax_balance_before.sub(frax_balance_after)).to.be.eq(WAD);
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.gt(
      WAD.mul(9).div(10)
    );

    console.log("Performing exchange_underlying");

    frax_balance_before = await frax.balanceOf(deployer.address);
    let dai_balance_before = await dai.balanceOf(deployer.address);

    await frax3crv["exchange_underlying(int128,int128,uint256,uint256)"](
      0,
      1,
      WAD,
      WAD.mul(9).div(10)
    );

    frax_balance_after = await frax.balanceOf(deployer.address);
    let dai_balance_after = await dai.balanceOf(deployer.address);

    expect(frax_balance_before.sub(frax_balance_after)).to.be.eq(WAD);
    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(
      WAD.mul(9).div(10)
    );

    console.log("Removing liquidity");

    let frax3crv_balance_before = await frax3crv.balanceOf(deployer.address);
    frax_balance_before = await frax.balanceOf(deployer.address);
    _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);

    await frax3crv["remove_liquidity(uint256,uint256[2])"](WAD.div(100), [
      WAD.div(110),
      WAD.div(110),
    ]);

    let frax3crv_balance_after = await frax3crv.balanceOf(deployer.address);
    frax_balance_after = await frax.balanceOf(deployer.address);
    _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);

    expect(frax_balance_after.sub(frax_balance_before)).to.be.gt(WAD.div(110));
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.gt(
      WAD.div(110)
    );
    expect(frax3crv_balance_before.sub(frax3crv_balance_after)).to.be.eq(
      WAD.div(100)
    );

    console.log("Removing liquidity imbalanced");

    frax_balance_before = await frax.balanceOf(deployer.address);
    _3crv_balance_before = await _3pool_token.balanceOf(deployer.address);
    frax3crv_balance_before = await frax3crv.balanceOf(deployer.address);

    await frax3crv["remove_liquidity_imbalance(uint256[2],uint256)"](
      [WAD, WAD.mul(2)],
      WAD.mul(7).div(4)
    );

    frax_balance_after = await frax.balanceOf(deployer.address);
    _3crv_balance_after = await _3pool_token.balanceOf(deployer.address);
    frax3crv_balance_after = await frax3crv.balanceOf(deployer.address);

    expect(frax_balance_after.sub(frax_balance_before)).to.be.eq(WAD);
    expect(_3crv_balance_after.sub(_3crv_balance_before)).to.be.eq(WAD.mul(2));
    expect(frax3crv_balance_before.sub(frax3crv_balance_after)).to.be.lt(
      WAD.mul(7).div(4)
    );

    console.log("Removing liquidity one coin");

    frax_balance_before = await frax.balanceOf(deployer.address);
    frax3crv_balance_before = await frax3crv.balanceOf(deployer.address);

    await frax3crv["remove_liquidity_one_coin(uint256,int128,uint256)"](
      WAD,
      0,
      WAD.mul(18).div(10)
    );

    frax_balance_after = await frax.balanceOf(deployer.address);
    frax3crv_balance_after = await frax3crv.balanceOf(deployer.address);

    expect(frax_balance_after.sub(frax_balance_before)).to.be.gt(
      WAD.mul(18).div(10)
    );
    expect(frax3crv_balance_before.sub(frax3crv_balance_after)).to.be.eq(WAD);
  });

  it("Curve stETH mock test", async function () {
    const steth = await deployToken("STETH", 18);

    let coins = [ETH_ADDRESS, steth.address];

    let tokenConstructorArgs = ["Curve STETH/ETH LP Token", "steCRV", 18];

    const steCRV_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    let poolConstructorArgs = [
      deployer.address,
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

    await seedCoins(coins, steCRV.address, deployer);

    await steth.approve(steCRV.address, MAX_INT);

    await steCRV_token.set_minter(steCRV.address);

    console.log("Syncing pool");
    await steCRV.sync_pool(WAD, 50);

    console.log("Adding liquidity");

    await steCRV.add_liquidity([WAD.mul(100), WAD.mul(100)], WAD.mul(199), {
      value: WAD.mul(100),
    });

    expect(await steCRV_token.balanceOf(deployer.address)).to.be.gt(
      WAD.mul(199)
    );

    expect(await steCRV.balances(0)).to.be.eq(WAD.mul(100));
    expect(await steCRV.balances(1)).to.be.eq(WAD.mul(100));

    expect(await steCRV.get_virtual_price()).to.be.eq(WAD);

    await steCRV.sync_pool(WAD.mul(2), 1000);

    expect(await steCRV.balances(0)).to.be.eq(WAD.mul(200));
    expect(await steCRV.balances(1)).to.be.eq(WAD.mul(200));

    expect(await steCRV.get_virtual_price()).to.be.eq(WAD.mul(2));

    console.log("Performing exchange");

    let eth_balance_before = await deployer.provider.getBalance(steCRV.address);
    let steth_balance_before = await steth.balanceOf(deployer.address);

    await steCRV.exchange(0, 1, WAD, WAD.mul(9).div(10), { value: WAD });

    let eth_balance_after = await deployer.provider.getBalance(steCRV.address);
    let steth_balance_after = await steth.balanceOf(deployer.address);

    expect(eth_balance_after.sub(eth_balance_before)).to.be.eq(WAD);
    expect(steth_balance_after.sub(steth_balance_before)).to.be.gt(
      WAD.mul(9).div(10)
    );

    console.log("Removing liquidity");

    let steCRV_balance_before = await steCRV_token.balanceOf(deployer.address);
    eth_balance_before = await deployer.provider.getBalance(steCRV.address);
    steth_balance_before = await steth.balanceOf(deployer.address);

    await steCRV.remove_liquidity(WAD.div(100), [WAD.div(110), WAD.div(110)]);

    let steCRV_balance_after = await steCRV_token.balanceOf(deployer.address);
    eth_balance_after = await deployer.provider.getBalance(steCRV.address);
    steth_balance_after = await steth.balanceOf(deployer.address);

    expect(eth_balance_before.sub(eth_balance_after)).to.be.gt(WAD.div(110));
    expect(steth_balance_after.sub(steth_balance_before)).to.be.gt(
      WAD.div(110)
    );
    expect(steCRV_balance_before.sub(steCRV_balance_after)).to.be.eq(
      WAD.div(100)
    );

    console.log("Removing liquidity imbalanced");

    steCRV_balance_before = await steCRV_token.balanceOf(deployer.address);
    eth_balance_before = await deployer.provider.getBalance(steCRV.address);
    steth_balance_before = await steth.balanceOf(deployer.address);

    await steCRV.remove_liquidity_imbalance(
      [WAD, WAD.mul(2)],
      WAD.mul(16).div(10)
    );

    steCRV_balance_after = await steCRV_token.balanceOf(deployer.address);
    eth_balance_after = await deployer.provider.getBalance(steCRV.address);
    steth_balance_after = await steth.balanceOf(deployer.address);

    expect(eth_balance_before.sub(eth_balance_after)).to.be.eq(WAD);
    expect(steth_balance_after.sub(steth_balance_before)).to.be.eq(WAD.mul(2));
    expect(steCRV_balance_before.sub(steCRV_balance_after)).to.be.lt(
      WAD.mul(16).div(10)
    );

    console.log("Removing liquidity one coin");

    steCRV_balance_before = await steCRV_token.balanceOf(deployer.address);
    eth_balance_before = await deployer.provider.getBalance(steCRV.address);

    await steCRV.remove_liquidity_one_coin(WAD, 0, WAD.mul(9).div(10));

    steCRV_balance_after = await steCRV_token.balanceOf(deployer.address);
    eth_balance_after = await deployer.provider.getBalance(steCRV.address);

    expect(eth_balance_before.sub(eth_balance_after)).to.be.gt(WAD);
    expect(steCRV_balance_before.sub(steCRV_balance_after)).to.be.eq(WAD);
  });

  it("Curve SUSD mock test", async function () {
    const dai = await deployToken("DAI", 18);
    const usdc = await deployToken("USDC", 6);
    const usdt = await deployToken("USDT", 6);
    const susd = await deployToken("SUSD", 18);

    let coins = [dai.address, usdc.address, usdt.address, susd.address];

    let tokenConstructorArgs = [
      "Curve DAI/USDC/USDC/SUSD LP Token",
      "sCRV",
      18,
    ];

    const sCRV_token = await deploy<CurveToken>(
      "CurveToken",
      log,
      ...tokenConstructorArgs
    );

    let poolConstructorArgs = [
      deployer.address,
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

    const sCRV_deposit = await deploy<CurveSUSDDeposit>(
      "CurveSUSDDeposit",
      log,
      coins,
      coins,
      sCRV.address,
      sCRV_token.address
    );

    await seedCoins(coins, sCRV.address, deployer);

    await dai.approve(sCRV.address, MAX_INT);
    await usdc.approve(sCRV.address, MAX_INT);
    await usdt.approve(sCRV.address, MAX_INT);
    await susd.approve(sCRV.address, MAX_INT);

    await sCRV_token.approve(sCRV_deposit.address, MAX_INT);

    await sCRV_token.set_minter(sCRV.address);

    console.log("Syncing pool");
    await sCRV.sync_pool(WAD, 100);

    console.log("Adding liquidity");
    await sCRV.add_liquidity(
      [WAD.mul(100), USDC_UNIT.mul(100), USDC_UNIT.mul(100), WAD.mul(100)],
      0
    );

    expect(await sCRV.balances(0)).to.be.eq(WAD.mul(100));
    expect(await sCRV.balances(1)).to.be.eq(USDC_UNIT.mul(100));
    expect(await sCRV.balances(2)).to.be.eq(USDC_UNIT.mul(100));
    expect(await sCRV.balances(3)).to.be.eq(WAD.mul(100));

    expect(await sCRV.get_virtual_price()).to.be.eq(WAD);

    await sCRV.sync_pool(WAD.mul(2), 2000);

    expect(await sCRV.balances(0)).to.be.eq(WAD.mul(200));
    expect(await sCRV.balances(1)).to.be.eq(USDC_UNIT.mul(200));
    expect(await sCRV.balances(2)).to.be.eq(USDC_UNIT.mul(200));
    expect(await sCRV.balances(3)).to.be.eq(WAD.mul(200));

    expect(await sCRV.get_virtual_price()).to.be.eq(WAD.mul(2));

    let dai_balance_before = await dai.balanceOf(deployer.address);
    let susd_balance_before = await susd.balanceOf(deployer.address);

    console.log("Performing exchange");
    await sCRV.exchange(0, 3, WAD.div(100), WAD.div(110));

    let dai_balance_after = await dai.balanceOf(deployer.address);
    let susd_balance_after = await susd.balanceOf(deployer.address);

    expect(dai_balance_before.sub(dai_balance_after)).to.be.eq(WAD.div(100));
    expect(susd_balance_after.sub(susd_balance_before)).to.be.gt(WAD.div(110));

    expect(await sCRV.balances(0)).to.be.eq(WAD.mul(200).add(WAD.div(100)));
    expect(await sCRV.balances(1)).to.be.lt(WAD.mul(200).sub(WAD.div(110)));
    expect(await sCRV.get_virtual_price()).to.be.gt(WAD.mul(2));

    console.log("Removing liquidity");

    let scrv_balance_before = await sCRV_token.balanceOf(deployer.address);
    dai_balance_before = await dai.balanceOf(deployer.address);
    let usdc_balance_before = await usdc.balanceOf(deployer.address);
    let usdt_balance_before = await usdt.balanceOf(deployer.address);
    susd_balance_before = await susd.balanceOf(deployer.address);

    await sCRV.remove_liquidity(WAD.div(100), [
      WAD.div(220),
      USDC_UNIT.div(220),
      USDC_UNIT.div(220),
      WAD.div(220),
    ]);

    let scrv_balance_after = await sCRV_token.balanceOf(deployer.address);
    dai_balance_after = await dai.balanceOf(deployer.address);
    let usdc_balance_after = await usdc.balanceOf(deployer.address);
    let usdt_balance_after = await usdt.balanceOf(deployer.address);
    susd_balance_after = await susd.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(WAD.div(220));
    expect(usdc_balance_after.sub(usdc_balance_before)).to.be.gt(
      USDC_UNIT.div(220)
    );
    expect(usdt_balance_after.sub(usdt_balance_before)).to.be.gt(
      USDC_UNIT.div(220)
    );
    expect(susd_balance_after.sub(susd_balance_before)).to.be.gt(WAD.div(220));
    expect(scrv_balance_before.sub(scrv_balance_after)).to.be.eq(WAD.div(100));

    console.log("Removing liquidity imbalanced");

    scrv_balance_before = await sCRV_token.balanceOf(deployer.address);
    dai_balance_before = await dai.balanceOf(deployer.address);
    usdc_balance_before = await usdc.balanceOf(deployer.address);
    usdt_balance_before = await usdt.balanceOf(deployer.address);
    susd_balance_before = await susd.balanceOf(deployer.address);

    await sCRV.remove_liquidity_imbalance(
      [WAD, USDC_UNIT, USDC_UNIT.mul(2), WAD.mul(2)],
      WAD.mul(7)
    );

    scrv_balance_after = await sCRV_token.balanceOf(deployer.address);
    dai_balance_after = await dai.balanceOf(deployer.address);
    usdc_balance_after = await usdc.balanceOf(deployer.address);
    usdt_balance_after = await usdt.balanceOf(deployer.address);
    susd_balance_after = await susd.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.eq(WAD);
    expect(usdc_balance_after.sub(usdc_balance_before)).to.be.eq(USDC_UNIT);
    expect(usdt_balance_after.sub(usdt_balance_before)).to.be.eq(
      USDC_UNIT.mul(2)
    );
    expect(susd_balance_after.sub(susd_balance_before)).to.be.eq(WAD.mul(2));
    expect(scrv_balance_before.sub(susd_balance_after)).to.be.lt(WAD.mul(7));

    console.log("Removing liquidity in one coin through deposit");

    dai_balance_before = await dai.balanceOf(deployer.address);
    scrv_balance_before = await sCRV_token.balanceOf(deployer.address);

    await sCRV_deposit["remove_liquidity_one_coin(uint256,int128,uint256)"](
      WAD.div(100),
      0,
      WAD.div(110)
    );

    dai_balance_after = await dai.balanceOf(deployer.address);
    scrv_balance_after = await sCRV_token.balanceOf(deployer.address);

    expect(dai_balance_after.sub(dai_balance_before)).to.be.gt(WAD.div(110));
    expect(scrv_balance_before.sub(scrv_balance_after)).to.be.eq(WAD.div(100));

    await sCRV_deposit.withdraw_donated_dust();

    console.log("Checking that liquidity calculation is correct");

    let lp_balance = await sCRV_token.balanceOf(deployer.address);

    await sCRV.remove_liquidity(lp_balance, [
      await sCRV.balances(0),
      await sCRV.balances(1),
      await sCRV.balances(2),
      await sCRV.balances(3),
    ]);

    expect(await sCRV.balances(0)).to.be.eq(0);
    expect(await sCRV.balances(1)).to.be.eq(0);
    expect(await sCRV.balances(2)).to.be.eq(0);
    expect(await sCRV.balances(3)).to.be.eq(0);
  });
});
