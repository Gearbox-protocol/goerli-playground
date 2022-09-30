import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractParams,
  contractsByNetwork,
  CurveLPToken,
  CurvePoolContract,
  CurveSteCRVPoolParams,
  ICurvePool__factory,
  IERC20__factory,
  IERC20Metadata__factory,
  tokenDataByNetwork,
  WAD,
} from "@gearbox-protocol/sdk";
import {
  BigNumber,
  BigNumberish,
  ContractTransaction,
  Overrides,
} from "ethers";

import {
  Curve3PoolMock,
  Curve3PoolMock__factory,
  CurveFraxUsdcMock__factory,
  CurveMetapoolMock,
  CurveStETHMock__factory,
  CurveSUSDDeposit,
  CurveToken,
} from "../../../types";
import { AbstractScript } from "../AbstractScript";
import { DeployedToken } from "../types";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_UNIT = BigNumber.from(10 ** 6);

type CurvePoolArgs = (lpToken: string) => Array<unknown>;
type SeedFn = (pool: string) => Promise<void>;

interface SyncedPool {
  sync_pool: (
    new_mainnet_virtual_price: BigNumberish,
    _a: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ) => Promise<ContractTransaction>;
}

export class CurveDeployer extends AbstractScript {
  private _3CrvToken: string | undefined;
  private _3CrvPool: string | undefined;

  protected async run(): Promise<void> {
    this.log.info("Deploying curve");

    if (await this.progress.isDeployNeeded("curve", "3Crv")) {
      await this.deploy3Crv();
    }
    this._3CrvToken = await this.progress.getOrThrow("curve", "3Crv");
    this._3CrvPool = await this.progress.getOrThrow("curve", "CURVE_3CRV_POOL");

    // STECRV DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "steCRV")) {
      await this.deploySteCRV();
    }

    // CURVE SUSD DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "crvPlain3andSUSD")) {
      await this.deploySUSD();
    }

    // CURVE GUSD3CRV DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "gusd3CRV")) {
      await this.deployGUSD3CRV();
    }

    // CURVE crvFRAX DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "crvFRAX")) {
      await this.deployFraxUSDC();
    }

    // CURVE FRAX3CRV DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "FRAX3CRV")) {
      await this.deployMetapool("FRAX3CRV", "FRAX", 1500, 4000000);
    }

    // CURVE LUSD3CRV DEPLOYMENT
    if (await this.progress.isDeployNeeded("curve", "LUSD3CRV")) {
      await this.deployMetapool("LUSD3CRV", "LUSD", 1500, 4000000);
    }
  }

  private async deploy3Crv(): Promise<void> {
    const coins = await Promise.all([
      this.progress.getOrThrow("normalTokens", "DAI"),
      this.progress.getOrThrow("normalTokens", "USDC"),
      this.progress.getOrThrow("normalTokens", "USDT"),
    ]);

    const poolAgrsFn = (lpToken: string) => [
      this.syncer,
      this.deployer.address,
      coins,
      lpToken,
      2000,
      1000000,
      5000000000,
    ];

    const seedFn = async (pool: string) => {
      this.log.debug("Minting tokens to 3CRV pool");

      await this.mintToken("DAI", pool, 10 ** 9);
      await this.mintToken("USDC", pool, 10 ** 9);
      await this.mintToken("USDT", pool, 10 ** 9);

      await this.mintToken("DAI", this.deployer.address, 10 ** 7);
      await this.mintToken("USDC", this.deployer.address, 10 ** 7);
      await this.mintToken("USDT", this.deployer.address, 10 ** 7);

      const _3pool = Curve3PoolMock__factory.connect(pool, this.deployer);

      // Adding initial liquidity to 3Pool in order to seed metapools

      await this.approve("DAI", pool);
      await this.approve("USDC", pool);
      await this.approve("USDT", pool);

      await waitForTransaction(
        _3pool.add_liquidity(
          [WAD.mul(10 ** 7), USDC_UNIT.mul(10 ** 7), USDC_UNIT.mul(10 ** 7)],
          0,
        ),
      );

      this.log.info("Seeded 3CRV and added liquidity");
    };

    await this.deployCurvePool(
      "3Crv",
      "Curve3PoolMock",
      "CURVE_3CRV_POOL",
      poolAgrsFn,
      seedFn,
      contractsByNetwork.Mainnet.CURVE_3CRV_POOL,
    );
  }

  private async deploySteCRV(): Promise<void> {
    const stETH = await this.progress.getOrThrow("lido", "STETH");

    const coins = [ETH_ADDRESS, stETH];

    const poolAgrsFn = (lpToken: string) => [
      this.syncer,
      this.deployer.address,
      coins,
      lpToken,
      50,
      4000000,
      5000000000,
    ];

    const seedFn = async (pool: string) => {
      const steCRV = CurveStETHMock__factory.connect(pool, this.deployer);
      // Note: on Goerli we don't have virtually unliminted GoerliETH
      // so I had to decrease x100 from what was on Kovan:
      // - stETH: from 10 ** 9 --> 10 ** 7
      // - ETH: from 1500 ETH --> 15 ETH
      await this.mintTokenByAddress(stETH, pool, 10 ** 7);
      this.log.debug("donating ETH");
      await waitForTransaction(steCRV.donate_eth({ value: WAD.mul(15) }));
    };

    const mainnetSteCRV_address = (
      contractParams.CURVE_STETH_GATEWAY as CurveSteCRVPoolParams
    ).pool.Mainnet;

    await this.deployCurvePool(
      "steCRV",
      "CurveStETHMock",
      "CURVE_STECRV_POOL",
      poolAgrsFn,
      seedFn,
      mainnetSteCRV_address,
    );
  }

  private async deployFraxUSDC(): Promise<void> {
    const coins = await Promise.all([
      this.progress.getOrThrow("normalTokens", "FRAX"),
      this.progress.getOrThrow("normalTokens", "USDC"),
    ]);

    const poolAgrsFn = (lpToken: string) => [
      this.syncer, // mock syncer
      this.deployer.address, // Contract owner address
      coins, // Addresses of ERC20 conracts of coins
      lpToken, // Address of the token representing LP share
      1500, // Amplification coefficient multiplied by n * (n - 1)
      4000000, // Fee to charge for exchanges
      5000000000, // Admin fee
    ];

    const seedFn = async (pool: string) => {
      this.log.debug("Minting tokens to FRAX_USDC pool");
      const fraxUsdcPool = CurveFraxUsdcMock__factory.connect(
        pool,
        this.deployer,
      );

      await this.mintToken("FRAX", this.deployer.address, 10 ** 9);
      await this.mintToken("USDC", this.deployer.address, 10 ** 9);
      await this.approve("FRAX", pool);
      await this.approve("USDC", pool);

      await waitForTransaction(
        fraxUsdcPool.add_liquidity(
          [WAD.mul(10 ** 9), USDC_UNIT.mul(10 ** 9)],
          0,
        ),
      );

      this.log.info("Added liquidity to FRAX_USDC pool");
    };

    await this.deployCurvePool(
      "crvFRAX",
      "CurveFraxUsdcMock",
      "CURVE_FRAX_USDC_POOL",
      poolAgrsFn,
      seedFn,
      contractsByNetwork.Mainnet.CURVE_FRAX_USDC_POOL,
    );
  }

  private async deploySUSD(): Promise<void> {
    const coins = await Promise.all([
      this.progress.getOrThrow("normalTokens", "DAI"),
      this.progress.getOrThrow("normalTokens", "USDC"),
      this.progress.getOrThrow("normalTokens", "USDT"),
      this.progress.getOrThrow("normalTokens", "sUSD"),
    ]);

    const poolAgrsFn = (lpToken: string) => [
      this.syncer,
      coins,
      coins,
      lpToken,
      100,
      4000000,
    ];

    const seedFn = async (pool: string) => {
      await this.mintToken("DAI", pool, 10 ** 9);
      await this.mintToken("USDC", pool, 10 ** 9);
      await this.mintToken("USDT", pool, 10 ** 9);
      await this.mintToken("sUSD", pool, 10 ** 9);
    };

    await this.deployCurvePool(
      "crvPlain3andSUSD",
      "CurveSUSDMock",
      "CURVE_SUSD_POOL",
      poolAgrsFn,
      seedFn,
    );

    const lpToken = this.progress.get("curve", "crvPlain3andSUSD");
    const pool = this.progress.get("curve", "CURVE_SUSD_POOL");

    const depositConstructorArgs = [coins, coins, pool, lpToken];

    this.log.debug("Deploying SUSD wrapper");

    const sCRV_deposit = await this.deploy<CurveSUSDDeposit>(
      "CurveSUSDDeposit",
      ...depositConstructorArgs,
    );

    await this.progress.save(
      "curve",
      "CURVE_SUSD_DEPOSIT",
      sCRV_deposit.address,
    );
  }

  private async deployGUSD3CRV(): Promise<void> {
    const coins = [
      await this.progress.getOrThrow("normalTokens", "GUSD"),
      this._3CrvToken,
    ];

    const poolAgrs = (lpToken: string) => [
      this.syncer,
      this.deployer.address,
      coins,
      lpToken,
      this._3CrvPool,
      1000,
      4000000,
      5000000000,
    ];

    const seedFn = async (pool: string) => {
      const _3crv = IERC20__factory.connect(this._3CrvToken!, this.deployer);

      await this.mintToken("GUSD", pool, 10 ** 6);
      await waitForTransaction(_3crv.transfer(pool, WAD.mul(10 ** 6)));
    };

    await this.deployCurvePool(
      "gusd3CRV",
      "CurveGUSDMock",
      "CURVE_GUSD_POOL",
      poolAgrs,
      seedFn,
    );
  }

  private async deployCurvePool(
    tokenSymbol: CurveLPToken,
    poolContractName: string,
    poolType: CurvePoolContract | "CURVE_STECRV_POOL",
    poolAgrs: CurvePoolArgs,
    seedFn: SeedFn,
    mainnetAddress?: string,
  ): Promise<void> {
    const mainnetToken = IERC20Metadata__factory.connect(
      tokenDataByNetwork.Mainnet[tokenSymbol],
      this.mainnetProvider,
    );

    const tokenConstructorArgs = [
      await mainnetToken.name(),
      tokenSymbol,
      await mainnetToken.decimals(),
    ];

    this.log.debug(`Deploying ${tokenSymbol}: token mock`);

    const lpToken = await this.deploy<CurveToken>(
      "CurveToken",
      ...tokenConstructorArgs,
    );

    const poolConstructorArgs = poolAgrs(lpToken.address);

    this.log.debug(`Deploying ${poolType}: contract`);

    const pool = await this.deploy<Curve3PoolMock>(
      poolContractName,
      ...poolConstructorArgs,
    );
    this.log.debug(`Deploying ${tokenSymbol}: set as minter`);

    await waitForTransaction(lpToken.set_minter(pool.address));

    this.log.info(
      `${tokenSymbol} token mock was deployed at at ${lpToken.address}`,
    );
    this.log.info(`${poolType} was deployed at at ${pool.address}`);

    let mainnetAddr = mainnetAddress;
    if (!mainnetAddr && poolType !== "CURVE_STECRV_POOL") {
      mainnetAddr = contractsByNetwork.Mainnet[poolType];
    }

    if (!mainnetAddr) {
      throw new Error("Mainnet address is undefined");
    }

    await this.syncVirtualPrice(mainnetAddr, pool, tokenSymbol);

    await seedFn(pool.address);

    await this.progress.save("curve", tokenSymbol, lpToken.address);
    await this.progress.save("curve", poolType, pool.address);
  }

  private async syncVirtualPrice(
    address: string,
    pool: SyncedPool,
    symbol: string,
  ): Promise<void> {
    const mainnetPool = ICurvePool__factory.connect(
      address,
      this.mainnetProvider,
    );

    const virtualPrice = await mainnetPool.get_virtual_price();
    const a = await mainnetPool.A();

    this.log.debug(`Syncing ${symbol} virtual price: ${virtualPrice}, a: ${a}`);

    await waitForTransaction(pool.sync_pool(virtualPrice, a));

    this.log.info(
      `${symbol} pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`,
    );
  }

  private async deployMetapool(
    lpTokenSymbol: CurveLPToken,
    token: DeployedToken,
    A: number,
    fee: number,
  ): Promise<void> {
    const tokenAddr = await this.progress.getOrThrow("normalTokens", token);
    const coins = [tokenAddr, this._3CrvToken];

    const mainnetToken = IERC20Metadata__factory.connect(
      tokenDataByNetwork.Mainnet[token],
      this.mainnetProvider,
    );

    const poolConstructorArgs = [
      this.syncer,
      await mainnetToken.name(),
      token,
      coins[0],
      await mainnetToken.decimals(),
      A,
      fee,
      this.deployer.address,
      this._3CrvPool,
      coins[1],
    ];

    this.log.debug(`Deploying ${lpTokenSymbol}: token mock`);
    const pool = await this.deploy<CurveMetapoolMock>(
      "CurveMetapoolMock",
      ...poolConstructorArgs,
    );

    const symbol = await pool.symbol();

    if (symbol !== `${lpTokenSymbol}-f`) {
      throw new Error(
        `Incorrect metapool symbol: ${symbol} should be ${`${lpTokenSymbol}-f`}`,
      );
    }

    this.log.info(
      `Curve ${lpTokenSymbol} mock (implements ERC20) was deployed at at ${pool.address}`,
    );

    await this.syncVirtualPrice(
      tokenDataByNetwork.Mainnet[lpTokenSymbol],
      pool,
      lpTokenSymbol,
    );

    await this.mintToken(token, pool.address, 10 ** 6);

    const _3crv = IERC20__factory.connect(this._3CrvToken!, this.deployer);
    await waitForTransaction(_3crv.transfer(pool.address, WAD.mul(10 ** 6)));

    await this.progress.save("curve", lpTokenSymbol, pool.address);
  }
}
