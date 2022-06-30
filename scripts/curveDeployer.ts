import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractParams,
  contractsByNetwork,
  CurveLPToken,
  CurvePoolContract,
  CurveSteCRVPoolParams,
  ICurvePool__factory,
  IERC20Metadata__factory,
  IERC20__factory,
  NormalToken,
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
  CurveMetapoolMock,
  CurveStETHMock__factory,
  CurveSUSDDeposit,
  CurveToken,
} from "../types";
import { AbstractDeployer } from "./abstractDeployer";
import { SYNCER } from "./constants";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_UNIT = BigNumber.from(10 ** 6);

type CurvePoolArgs = (lpToken: string) => Array<unknown>;
type SeedFn = (pool: string) => Promise<void>;

interface SyncedPool {
  sync_pool(
    new_mainnet_virtual_price: BigNumberish,
    _a: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;
}

export class CurveDeployer extends AbstractDeployer {
  _3CrvToken: string | undefined;
  _3CrvPool: string | undefined;

  async deploy() {
    if (this.isDeployNeeded("3Crv")) {
      let coins = [
        tokenDataByNetwork.Kovan.DAI,
        tokenDataByNetwork.Kovan.USDC,
        tokenDataByNetwork.Kovan.USDT,
      ];

      const poolAgrsFn = (lpToken: string) => [
        SYNCER,
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
            0
          )
        );

        this.log.info("Seeded 3CRV and added liquidity");
      };

      await this.deployCurvePool(
        "3Crv",
        "Curve3PoolMock",
        "CURVE_3CRV_POOL",
        poolAgrsFn,
        seedFn,
        contractsByNetwork.Mainnet.CURVE_3CRV_POOL
      );
    }

    this._3CrvToken = this.getProgressOrThrow("3Crv");
    this._3CrvPool = this.getProgressOrThrow("CURVE_3CRV_POOL");

    ///
    /// STECRV DEPLOYMENT

    if (this.isDeployNeeded("steCRV")) {
      const stETH = this.getProgressOrThrow("STETH");

      const coins = [ETH_ADDRESS, stETH];

      const poolAgrsFn = (lpToken: string) => [
        SYNCER,
        this.deployer.address,
        coins,
        lpToken,
        50,
        4000000,
        5000000000,
      ];

      const seedFn = async (pool: string) => {
        const steCRV = CurveStETHMock__factory.connect(pool, this.deployer);

        await this.mintTokenByAddress(stETH, pool, 10 ** 9);
        await waitForTransaction(steCRV.donate_eth({ value: WAD.mul(1500) }));
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
        mainnetSteCRV_address
      );
    }

    ///
    /// CURVE SUSD DEPLOYMENT
    if (this.isDeployNeeded("crvPlain3andSUSD")) {
      const coins = [
        tokenDataByNetwork.Kovan.DAI,
        tokenDataByNetwork.Kovan.USDC,
        tokenDataByNetwork.Kovan.USDT,
        tokenDataByNetwork.Kovan.sUSD,
      ];

      const poolAgrsFn = (lpToken: string) => [
        SYNCER,
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
        seedFn
      );

      const lpToken = this.getProgress("crvPlain3andSUSD");
      const pool = this.getProgress("CURVE_SUSD_POOL");

      let depositConstructorArgs = [coins, coins, pool, lpToken];

      this.log.debug("Deploying SUSD wrapper");

      const sCRV_deposit = await deploy<CurveSUSDDeposit>(
        "CurveSUSDDeposit",
        this.log,
        ...depositConstructorArgs
      );

      this.saveProgress("CURVE_SUSD_DEPOSIT", sCRV_deposit.address);
    }

    ///
    /// CURVE GUSD3CRV DEPLOYMENT
    if (this.isDeployNeeded("gusd3CRV")) {
      const coins = [tokenDataByNetwork.Kovan.GUSD, this._3CrvToken];

      const poolAgrs = (lpToken: string) => [
        SYNCER,
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
        seedFn
      );
    }

    /// CURVE FRAX3CRV DEPLOYMENT
    if (this.isDeployNeeded("FRAX3CRV")) {
      await this.deployMetapool("FRAX3CRV", "FRAX", 1500, 4000000);
    }

    /// CURVE LUSD3CRV DEPLOYMENT
    if (this.isDeployNeeded("LUSD3CRV")) {
      await this.deployMetapool("LUSD3CRV", "LUSD", 1500, 4000000);
    }
  }

  protected async deployCurvePool(
    tokenSymbol: CurveLPToken,
    poolContractName: string,
    poolType: CurvePoolContract | "CURVE_STECRV_POOL",
    poolAgrs: CurvePoolArgs,
    seedFn: SeedFn,
    mainnetAddress?: string
  ) {
    const mainnetToken = IERC20Metadata__factory.connect(
      tokenDataByNetwork.Mainnet[tokenSymbol],
      this.mainnetProvider
    );

    let tokenConstructorArgs = [
      await mainnetToken.name(),
      tokenSymbol,
      await mainnetToken.decimals(),
    ];

    this.log.debug(`Deploying ${tokenSymbol}: token mock`);

    const lpToken = await deploy<CurveToken>(
      "CurveToken",
      this.log,
      ...tokenConstructorArgs
    );

    const poolConstructorArgs = poolAgrs(lpToken.address);

    this.log.debug(`Deploying ${poolType}: contract`);

    const pool = await deploy<Curve3PoolMock>(
      poolContractName,
      this.log,
      ...poolConstructorArgs
    );
    this.log.debug(`Deploying ${tokenSymbol}: set as minter`);

    await waitForTransaction(lpToken.set_minter(pool.address));

    this.log.info(
      `${tokenSymbol} token mock was deployed at at ${lpToken.address}`
    );
    this.log.info(`${poolType} was deployed at at ${pool.address}`);

    if (!mainnetAddress && poolType !== "CURVE_STECRV_POOL") {
      mainnetAddress = contractsByNetwork.Mainnet[poolType];
    }

    if (!mainnetAddress) {
      throw new Error("Mainnet address is undefined");
    }

    await this.syncVirtualPrice(mainnetAddress, pool, tokenSymbol);

    await seedFn(pool.address);

    this.saveProgress(tokenSymbol, lpToken.address);
    this.saveProgress(poolType, pool.address);
  }

  async deployMetapool(
    lpTokenSymbol: CurveLPToken,
    token: NormalToken,
    A: number,
    fee: number
  ) {
    const coins = [tokenDataByNetwork.Kovan[token], this._3CrvToken];

    const mainnetToken = IERC20Metadata__factory.connect(
      tokenDataByNetwork.Mainnet[token],
      this.mainnetProvider
    );

    const poolConstructorArgs = [
      SYNCER,
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
    const pool = await deploy<CurveMetapoolMock>(
      "CurveMetapoolMock",
      this.log,
      ...poolConstructorArgs
    );

    let symbol = await pool.symbol();

    if (symbol !== `${lpTokenSymbol}-f`) {
      throw `Incorrect metapool symbol: ${symbol} should be ${`${lpTokenSymbol}-f`}`;
    }

    this.log.info(
      `Curve ${lpTokenSymbol} mock (implements ERC20) was deployed at at ${pool.address}`
    );

    await this.syncVirtualPrice(
      tokenDataByNetwork.Mainnet[lpTokenSymbol],
      pool,
      lpTokenSymbol
    );

    await this.mintToken(token, pool.address, 10 ** 6);

    const _3crv = IERC20__factory.connect(this._3CrvToken!, this.deployer);
    await waitForTransaction(_3crv.transfer(pool.address, WAD.mul(10 ** 6)));

    this.saveProgress(lpTokenSymbol, pool.address);
  }

  protected async syncVirtualPrice(
    address: string,
    pool: SyncedPool,
    symbol: string
  ) {
    const mainnetSteCRV = ICurvePool__factory.connect(
      address,
      this.mainnetProvider
    );

    const virtualPrice = await mainnetSteCRV.get_virtual_price();
    const a = await mainnetSteCRV.A();

    this.log.debug("Syncing steCRV virtual price");

    await waitForTransaction(pool.sync_pool(virtualPrice, a));

    this.log.info(
      `${symbol} pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
    );
  }
}
