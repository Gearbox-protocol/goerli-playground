import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  AdapterInterface,
  contractParams,
  MAX_INT,
  WAD,
} from "@gearbox-protocol/sdk";

import {
  CurveGUSDMock__factory,
  CurveMetapoolMock__factory,
  CurveStETHMock__factory,
  CurveSUSDMock__factory,
  CurveToken__factory,
  ERC20Testnet__factory,
  Lido__factory,
} from "../../types";
import { AbstractScript } from "./AbstractScript";

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
      this.deployer
    );

    const usdc = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "USDC"),
      this.deployer
    );

    const usdt = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "USDT"),
      this.deployer
    );

    const susd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "sUSD"),
      this.deployer
    );

    const gusd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "GUSD"),
      this.deployer
    );

    const frax = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "FRAX"),
      this.deployer
    );

    const lusd = ERC20Testnet__factory.connect(
      await this.progress.getOrThrow("normalTokens", "LUSD"),
      this.deployer
    );

    const _3crv = CurveToken__factory.connect(
      await this.progress.getOrThrow("curve", "3Crv"),
      this.deployer
    );

    const steth = Lido__factory.connect(
      await this.progress.getOrThrow("lido", "STETH"),
      this.deployer
    );

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
      "CURVE_STECRV_POOL"
    );

    const steCRV = CurveStETHMock__factory.connect(
      steCRVPoolAddr,
      this.deployer
    );

    this.log.info("Approving stETH");

    await waitForTransaction(steth.approve(steCRVPoolAddr, MAX_INT));
    await waitForTransaction(steth.mint(this.deployer.address, WAD));

    this.log.info("Adding liquidity to steCRV");

    await waitForTransaction(
      steCRV.add_liquidity([WAD, WAD], 0, { value: WAD })
    );

    this.log.info(
      `ETH balance: ${await steCRV.balances(
        0
      )}, stETH balance: ${await steCRV.balances(1)}`
    );

    //
    // Seeding SUSD
    //

    this.log.info("Adding liquidity to SUSD pool");

    const sCRVAddress = await this.progress.getOrThrow(
      "curve",
      "CURVE_SUSD_POOL"
    );

    this.log.info("Approving tokens");

    await waitForTransaction(dai.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(usdc.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(usdt.approve(sCRVAddress, MAX_INT));
    await waitForTransaction(susd.approve(sCRVAddress, MAX_INT));

    this.log.info("Adding liquidity to SUSD");

    const sCRV = CurveSUSDMock__factory.connect(sCRVAddress, this.deployer);

    await waitForTransaction(
      sCRV.add_liquidity([WAD, 10 ** 6, 10 ** 6, WAD], 0)
    );

    this.log.info(`
      DAI  balance: ${await sCRV.balances(0)},
      USDC balance: ${await sCRV.balances(1)},
      USDT balance: ${await sCRV.balances(2)},
      SUSD balance: ${await sCRV.balances(3)}
    `);

    //
    // Seeding GUSD
    //

    this.log.info("Adding liquidity to GUSD pool");

    const gusdAddress = await this.progress.getOrThrow(
      "curve",
      "CURVE_GUSD_POOL"
    );

    this.log.info("Approving tokens");

    await waitForTransaction(gusd.approve(gusdAddress, MAX_INT));
    // Call approve two times because this is how CurveToken.vy contract works
    await waitForTransaction(_3crv.approve(gusdAddress, 0));
    await waitForTransaction(_3crv.approve(gusdAddress, MAX_INT));

    this.log.info("Adding liquidity to GUSD");

    const gusdPool = CurveGUSDMock__factory.connect(gusdAddress, this.deployer);

    await waitForTransaction(gusdPool.add_liquidity([10 ** 2, WAD], 0));

    this.log.info(`
      GUSD balance: ${await gusdPool.balances(0)},
      3CRV balance: ${await gusdPool.balances(1)}
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
      this.deployer
    );

    await waitForTransaction(
      frax3crv["add_liquidity(uint256[2],uint256)"]([WAD, WAD], 0)
    );

    this.log.info(`
      FRAX balance: ${await frax3crv.balances(0)},
      3CRV balance: ${await frax3crv.balances(1)}
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
      this.deployer
    );

    await waitForTransaction(
      lusd3crv["add_liquidity(uint256[2],uint256)"]([WAD, WAD], 0)
    );

    this.log.info(`
      LUSD balance: ${await lusd3crv.balances(0)},
      3CRV balance: ${await lusd3crv.balances(1)}
    `);
  }
}
