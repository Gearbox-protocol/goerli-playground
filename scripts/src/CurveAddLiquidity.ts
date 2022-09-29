import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  AdapterInterface,
  contractParams,
  formatBN,
  MAX_INT,
  WAD,
} from "@gearbox-protocol/sdk";
import { BigNumber } from "ethers";

import {
  Curve3PoolMock__factory,
  CurveGUSDMock__factory,
  CurveMetapoolMock__factory,
  CurveStETHMock__factory,
  CurveSUSDMock__factory,
  CurveToken__factory,
  ERC20Testnet__factory,
  Lido__factory,
} from "../../types";
import { AbstractScript } from "./AbstractScript";

const USD_AMOUNT = BigNumber.from(10 ** 7);
const ETH_AMOUNT = 100;

/**
 * This script adds liquidity to Curve pools deployed on previous step
 * It can be run multiple times
 */
export class CurveAddLiquidity extends AbstractScript {
  protected async run(): Promise<void> {
    this.log.info("Adding liquidity");
    //
    // Define tokens
    //
    const dai = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "DAI"),
      this.deployer,
    );

    const usdc = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "USDC"),
      this.deployer,
    );

    const usdt = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "USDT"),
      this.deployer,
    );

    const susd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "sUSD"),
      this.deployer,
    );

    const gusd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "GUSD"),
      this.deployer,
    );

    const frax = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "FRAX"),
      this.deployer,
    );

    const lusd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "LUSD"),
      this.deployer,
    );

    const _3crv = CurveToken__factory.connect(
      await this.progress.getOrThrow("curve", "3Crv"),
      this.deployer,
    );

    const steth = Lido__factory.connect(
      await this.progress.getOrThrow("lido", "STETH"),
      this.deployer,
    );

    //
    // Adding liquidity to 3crv pool
    //
    const _3crvPool = Curve3PoolMock__factory.connect(
      await this.progress.getOrThrow("curve", "CURVE_3CRV_POOL"),
      this.deployer,
    );

    await waitForTransaction(dai.approve(_3crvPool.address, MAX_INT));
    await waitForTransaction(usdc.approve(_3crvPool.address, MAX_INT));
    await waitForTransaction(usdt.approve(_3crvPool.address, MAX_INT));
    await waitForTransaction(
      _3crvPool.add_liquidity(
        [USD_AMOUNT.mul(WAD), USD_AMOUNT.mul(10 ** 6), USD_AMOUNT.mul(10 ** 6)],
        0,
      ),
    );
    this.log.info(`
      DAI  balance: ${formatBN(await _3crvPool.balances(0), 18)},
      USDC balance: ${formatBN(await _3crvPool.balances(1), 6)},
      USDT balance: ${formatBN(await _3crvPool.balances(2), 6)},
      
      Deployer's 3CRV balance: ${formatBN(
        await _3crv.balanceOf(this.deployer.address),
        18,
      )},
    `);

    //
    // Adding liquidity to steCRV
    //

    this.log.info("Adding liquidity to steCRV");

    const gatewayParams = contractParams.CURVE_STETH_GATEWAY;

    if (gatewayParams.type !== AdapterInterface.CURVE_V1_STECRV_POOL) {
      throw new Error("Incorrect stETH type");
    }

    const steCRVPoolAddr = await this.progress.getOrThrow(
      "curve",
      "CURVE_STECRV_POOL",
    );

    const steCRV = CurveStETHMock__factory.connect(
      steCRVPoolAddr,
      this.deployer,
    );

    this.log.info("Approving stETH");
    await waitForTransaction(steth.approve(steCRVPoolAddr, MAX_INT));
    await waitForTransaction(
      steth.mint(this.deployer.address, WAD.mul(ETH_AMOUNT)),
    );

    this.log.info("Adding liquidity to steCRV");

    await waitForTransaction(
      steCRV.add_liquidity([WAD.mul(ETH_AMOUNT), WAD.mul(ETH_AMOUNT)], 0, {
        value: WAD.mul(ETH_AMOUNT),
      }),
    );

    this.log.info(
      `ETH balance: ${formatBN(await steCRV.balances(0), 18)},
       stETH balance: ${formatBN(await steCRV.balances(1), 18)}`,
    );

    //
    // Seeding SUSD
    //

    this.log.info("Adding liquidity to SUSD pool");

    const sCRVAddress = await this.progress.getOrThrow(
      "curve",
      "CURVE_SUSD_POOL",
    );

    this.log.info("Approving tokens");

    await waitForTransaction(dai.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(usdc.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(usdt.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(susd.approve(sCRVAddress, MAX_INT));

    this.log.info("Adding liquidity to SUSD");

    const sCRV = CurveSUSDMock__factory.connect(sCRVAddress, this.deployer);

    await waitForTransaction(
      sCRV.add_liquidity(
        [
          USD_AMOUNT.mul(WAD), // DAI
          USD_AMOUNT.mul(10 ** 6), // USDC
          USD_AMOUNT.mul(10 ** 6), // USDT
          USD_AMOUNT.mul(WAD), // SUSD
        ],
        0,
      ),
    );

    this.log.info(`
      DAI  balance: ${formatBN(await sCRV.balances(0), 18)},
      USDC balance: ${formatBN(await sCRV.balances(1), 6)},
      USDT balance: ${formatBN(await sCRV.balances(2), 6)},
      SUSD balance: ${formatBN(await sCRV.balances(3), 18)}
    `);

    //
    // Seeding GUSD
    //

    this.log.info("Adding liquidity to GUSD pool");

    const gusdAddress = await this.progress.getOrThrow(
      "curve",
      "CURVE_GUSD_POOL",
    );

    this.log.info("Approving tokens");

    await waitForTransaction(gusd.approve(gusdAddress, MAX_INT));
    // Call approve two times because this is how CurveToken.vy contract works
    await waitForTransaction(_3crv.approve(gusdAddress, 0));
    await waitForTransaction(_3crv.approve(gusdAddress, MAX_INT));

    this.log.info("Adding liquidity to GUSD");

    const gusdPool = CurveGUSDMock__factory.connect(gusdAddress, this.deployer);

    await waitForTransaction(
      gusdPool.add_liquidity([USD_AMOUNT.mul(10 ** 2), USD_AMOUNT.mul(WAD)], 0),
    );

    this.log.info(`
      GUSD balance: ${formatBN(await gusdPool.balances(0), 2)},
      3CRV balance: ${formatBN(await gusdPool.balances(1), 18)}
    `);

    //
    // Seeding FRAX
    //

    this.log.info("Adding liquidity to FRAX3CRV pool");

    const frax3crvAddress = await this.progress.getOrThrow("curve", "FRAX3CRV");

    this.log.info("Approving tokens");

    await waitForTransaction(frax.approve(frax3crvAddress, MAX_INT));
    // Call approve two times because this is how CurveToken.vy contract works
    await waitForTransaction(_3crv.approve(frax3crvAddress, 0));
    await waitForTransaction(_3crv.approve(frax3crvAddress, MAX_INT));

    this.log.info("Adding liquidity to FRAX3CRV");

    const frax3crv = CurveMetapoolMock__factory.connect(
      frax3crvAddress,
      this.deployer,
    );

    await waitForTransaction(
      frax3crv["add_liquidity(uint256[2],uint256)"](
        [USD_AMOUNT.mul(WAD), USD_AMOUNT.mul(WAD)],
        0,
      ),
    );

    this.log.info(`
      FRAX balance: ${formatBN(await frax3crv.balances(0), 18)},
      3CRV balance: ${formatBN(await frax3crv.balances(1), 18)}
    `);

    //
    // Seeding LUSD
    //

    this.log.info("Adding liquidity to LUSD3CRV pool");

    const lusd3crvAddress = await this.progress.getOrThrow("curve", "LUSD3CRV");

    this.log.info("Approving tokens");

    await waitForTransaction(lusd.approve(lusd3crvAddress, MAX_INT));
    // Call approve two times because this is how CurveToken.vy contract works
    await waitForTransaction(_3crv.approve(lusd3crvAddress, 0));
    await waitForTransaction(_3crv.approve(lusd3crvAddress, MAX_INT));

    this.log.info("Adding liquidity to LUSD3CRV");

    const lusd3crv = CurveMetapoolMock__factory.connect(
      lusd3crvAddress,
      this.deployer,
    );

    await waitForTransaction(
      lusd3crv["add_liquidity(uint256[2],uint256)"](
        [USD_AMOUNT.mul(WAD), USD_AMOUNT.mul(WAD)],
        0,
      ),
    );

    this.log.info(`
      LUSD balance: ${formatBN(await lusd3crv.balances(0), 18)},
      3CRV balance: ${formatBN(await lusd3crv.balances(1), 18)}
    `);
  }
}
