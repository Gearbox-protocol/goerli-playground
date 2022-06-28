// @ts-ignore
import { ethers, SignerOrProvider } from "hardhat";
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
  Lido,
  KovanConvexManager,
  ClaimZap,
  YearnMock,
  Curve3PoolMock__factory,
  CurveStETHMock__factory,
  ERC20Kovan__factory,
  CurveToken__factory,
  Lido__factory,
  BaseRewardPool__factory,
  VirtualBalanceRewardPool__factory,
} from "../types";
import { Verifier, deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { SYNCER } from "./constants";
import {
  tokenDataByNetwork,
  contractsByNetwork,
  contractParams,
  CurveSteCRVPoolParams,
  SupportedToken,
  SupportedContract,
  CurveLPToken,
  CurvePoolContract,
  ConvexLPToken,
  ConvexLPTokenData,
  ConvexPoolContract,
  ConvexStakedPhantomToken,
  YearnLPToken,
  convexTokens,
  yearnTokens,
  WAD,
  RAY,
  MAX_INT,
  ICurvePool__factory,
  IYVault__factory,
  ICurvePool,
  IERC20Metadata__factory,
  NormalToken,
} from "@gearbox-protocol/sdk";
import {
  providers,
  BigNumber,
  BigNumberish,
  Overrides,
  ContractTransaction,
} from "ethers";
import fs from "fs";
import { PartialRecord } from "@gearbox-protocol/sdk/lib/utils/types";

dotenv.config({ path: ".env.local" });

const PROGRESS_FILE_NAME = "./mockAddresses.json";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_UNIT = BigNumber.from(10 ** 6);
const GUSD_UNIT = BigNumber.from(10 ** 2);

interface SyncedPool {
  sync_pool(
    new_mainnet_virtual_price: BigNumberish,
    _a: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;
}
type SupportedEntity =
  | SupportedToken
  | SupportedContract
  | "CURVE_STECRV_POOL"
  | "KOVAN_CONVEX_MANAGER";

type AddressList = PartialRecord<SupportedEntity, string>;

type CurvePoolArgs = (lpToken: string) => Array<unknown>;

const convexExtraRewardTokens: Record<
  ConvexPoolContract,
  Array<SupportedToken>
> = {
  CONVEX_3CRV_POOL: [],
  CONVEX_GUSD_POOL: [],
  CONVEX_SUSD_POOL: ["SNX"],
  CONVEX_STECRV_POOL: ["LDO"],
  CONVEX_FRAX3CRV_POOL: ["FXS"],
};

const yearnTokenList: Array<YearnLPToken> = [
  "yvDAI",
  "yvUSDC",
  "yvWETH",
  "yvWBTC",
  "yvCurve_stETH",
  "yvCurve_FRAX",
];

class KovanPlaygroundDeplooyer {
  log: Logger = new Logger();
  verifier: Verifier = new Verifier();
  deployer: SignerWithAddress;
  mainnetProvider: SignerOrProvider;
  contractAddresses: AddressList = {};

  _3CrvToken: string | undefined;
  _3CrvPool: string | undefined;

  async deployMocks() {
    const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
    this.deployer = accounts[0];
    const chainId = await this.deployer.getChainId();

    const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
    if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

    if (fs.existsSync(PROGRESS_FILE_NAME)) {
      this.log.warn("FOUND FILE WITH PREVIOUS PROGRESS!");
      const savedProgress = fs.readFileSync(PROGRESS_FILE_NAME, {
        encoding: "utf-8",
      });

      this.contractAddresses = JSON.parse(savedProgress);
    }

    this.mainnetProvider = new providers.JsonRpcProvider(
      mainnetRpc
    ) as SignerOrProvider;

    this.log.info(`Deployer: ${this.deployer.address}`);

    if (chainId !== 42 && chainId !== 1337)
      throw new Error("Switch to Kovan network");

    await this.deployLido();
    await this.deployCurve();
    await this.seedCurve();
    await this.deployConvex();
    await this.deployYearn();

    this.log.info(this.contractAddresses);
  }

  async deployLido() {
    if (this.contractAddresses["STETH"]) {
      this.log.warn(
        "STETH is already deployed at: ",
        this.contractAddresses["STETH"]
      );
      return;
    }

    const lido = await deploy<Lido>("Lido", this.log, SYNCER);

    this.log.info(`Lido mock deployed at: ${lido.address}`);

    this.verifier.addContract({
      address: lido.address,
      constructorArguments: [SYNCER],
    });

    const mainnetLido = Lido__factory.connect(
      tokenDataByNetwork.Mainnet.STETH,
      this.mainnetProvider
    );

    const totalPooledEther = await mainnetLido.getTotalPooledEther();
    const totalShares = await mainnetLido.getTotalShares();

    await waitForTransaction(
      lido.syncExchangeRate(totalPooledEther, totalShares)
    );

    this.saveProgress("STETH", lido.address);

    this.log.info(
      `Lido mock synced - totalPooledEther: ${totalPooledEther}, totalShares: ${totalShares}`
    );
  }

  async deployCurve() {
    ///
    /// 3POOL DEPLOYMENT
    ///

    let tokenSymbol: CurveLPToken;
    let poolType: CurvePoolContract | "CURVE_STECRV_POOL";

    if (this.contractAddresses["3Crv"]) {
      this.log.warn("3crv was deployed");
    } else {
      let coins = [
        tokenDataByNetwork.Kovan.DAI,
        tokenDataByNetwork.Kovan.USDC,
        tokenDataByNetwork.Kovan.USDT,
      ];

      const poolAgrs = (lpToken: string) => [
        SYNCER,
        this.deployer.address,
        coins,
        lpToken,
        2000,
        1000000,
        5000000000,
      ];

      await this.deployCurvePool(
        "3Crv",
        "Curve3PoolMock",
        "CURVE_3CRV_POOL",
        poolAgrs,
        contractsByNetwork.Mainnet.CURVE_3CRV_POOL
      );
    }

    this._3CrvToken = this.contractAddresses["3Crv"];
    this._3CrvPool = this.contractAddresses["CURVE_3CRV_POOL"];

    ///
    /// STECRV DEPLOYMENT
    ///

    const stETH = this.contractAddresses["STETH"];

    if (!stETH) throw new Error("STETH is not set");

    if (this.contractAddresses["steCRV"]) {
      this.log.warn("steCRV is already deployed");
    } else {
      const coins = [ETH_ADDRESS, stETH];

      const poolAgrs = (lpToken: string) => [
        SYNCER,
        this.deployer.address,
        coins,
        lpToken,
        50,
        4000000,
        5000000000,
      ];

      const mainnetSteCRV_address = (
        contractParams.CURVE_STETH_GATEWAY as CurveSteCRVPoolParams
      ).pool.Mainnet;

      await this.deployCurvePool(
        "steCRV",
        "CurveStETHMock",
        "CURVE_STECRV_POOL",
        poolAgrs,
        mainnetSteCRV_address
      );
    }

    ///
    /// CURVE SUSD DEPLOYMENT
    ///

    if (this.contractAddresses["crvPlain3andSUSD"]) {
      this.log.warn("steCRV is already deployed");
    } else {
      const coins = [
        tokenDataByNetwork.Kovan.DAI,
        tokenDataByNetwork.Kovan.USDC,
        tokenDataByNetwork.Kovan.USDT,
        tokenDataByNetwork.Kovan.sUSD,
      ];

      const poolAgrs = (lpToken: string) => [
        SYNCER,
        coins,
        coins,
        lpToken,
        100,
        4000000,
      ];

      await this.deployCurvePool(
        "crvPlain3andSUSD",
        "CurveSUSDMock",
        "CURVE_SUSD_POOL",
        poolAgrs
      );

      const lpToken = this.contractAddresses.crvPlain3andSUSD;
      const pool = this.contractAddresses.CURVE_SUSD_POOL;

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
    ///

    if (this.contractAddresses["gusd3CRV"]) {
      this.log.warn("gusd3CRV is already deployed");
    } else {
      tokenSymbol = "gusd3CRV";
      poolType = "CURVE_GUSD_POOL";

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

      await this.deployCurvePool(
        "gusd3CRV",
        "CurveGUSDMock",
        "CURVE_GUSD_POOL",
        poolAgrs
      );
    }

    ///
    /// CURVE FRAX3CRV DEPLOYMENT
    ///

    if (this.contractAddresses["FRAX3CRV"]) {
      this.log.warn("FRAX3CRV is already deployed");
    } else {
      await this.deployMetapool("FRAX3CRV", "FRAX", 1500, 4000000);
    }

    ///
    /// CURVE LUSD3CRV DEPLOYMENT
    ///

    if (this.contractAddresses["LUSD3CRV"]) {
      this.log.warn("LUSD3CRV is already deployed");
    } else {
      tokenSymbol = "LUSD3CRV";
      await this.deployMetapool("LUSD3CRV", "LUSD", 1500, 4000000);
    }
  }

  protected async deployCurvePool(
    tokenSymbol: CurveLPToken,
    poolContractName: string,
    poolType: CurvePoolContract | "CURVE_STECRV_POOL",
    poolAgrs: CurvePoolArgs,
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
      mainnetToken.name(),
      lpTokenSymbol,
      coins[0],
      mainnetToken.decimals(),
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

    this.saveProgress(lpTokenSymbol, pool.address);

    await this.syncVirtualPrice(
      tokenDataByNetwork.Mainnet[lpTokenSymbol],
      pool,
      lpTokenSymbol
    );
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

  async seedCurve() {
    //
    // Define tokens
    //

    const dai = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.DAI,
      this.deployer
    );

    const usdc = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.USDC,
      this.deployer
    );

    const usdt = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.USDT,
      this.deployer
    );

    const susd = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.sUSD,
      this.deployer
    );

    const gusd = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.GUSD,
      this.deployer
    );

    const frax = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.FRAX,
      this.deployer
    );

    const lusd = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.LUSD,
      this.deployer
    );

    const _3crv = CurveToken__factory.connect(
      this.contractAddresses["3Crv"] as string,
      this.deployer
    );

    const steth = Lido__factory.connect(
      this.contractAddresses["STETH"] as string,
      this.deployer
    );

    //
    // Seed 3Pool
    //

    const _3poolAddress = this.contractAddresses["CURVE_3CRV_POOL"] as string;

    await waitForTransaction(dai.mint(_3poolAddress, WAD.mul(10 ** 9)));
    await waitForTransaction(usdc.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));
    await waitForTransaction(usdt.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));

    await waitForTransaction(dai.mint(this.deployer.address, WAD.mul(10 ** 7)));
    await waitForTransaction(
      usdc.mint(this.deployer.address, USDC_UNIT.mul(10 ** 7))
    );
    await waitForTransaction(
      usdt.mint(this.deployer.address, USDC_UNIT.mul(10 ** 7))
    );

    const _3pool = Curve3PoolMock__factory.connect(
      _3poolAddress,
      this.deployer
    );

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

    this.log.info("Seeded 3CRV and added liquidity");

    //
    // Seeding SUSD
    //

    const sCRV_address = this.contractAddresses["CURVE_SUSD_POOL"] as string;

    await waitForTransaction(dai.mint(sCRV_address, WAD.mul(10 ** 9)));
    await waitForTransaction(usdc.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
    await waitForTransaction(usdt.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
    await waitForTransaction(susd.mint(sCRV_address, WAD.mul(10 ** 9)));

    this.log.info("Seeded SUSD pool");

    //
    // Seeding steCRV
    //

    const steCRV_address = this.contractAddresses[
      "CURVE_STECRV_POOL"
    ] as string;

    const steCRV = CurveStETHMock__factory.connect(
      steCRV_address,
      this.deployer
    );

    await waitForTransaction(steth.mint(steCRV_address, WAD.mul(1500)));
    await waitForTransaction(steCRV.donate_eth({ value: WAD.mul(1500) }));

    this.log.info("Seeded steCRV pool");

    //
    // Seeding gusd3CRV
    //

    const gusd3CRVAddress = this.contractAddresses["CURVE_GUSD_POOL"] as string;

    await waitForTransaction(
      gusd.mint(gusd3CRVAddress, GUSD_UNIT.mul(10 ** 6))
    );
    await waitForTransaction(_3crv.transfer(gusd3CRVAddress, WAD.mul(10 ** 6)));

    this.log.info("Seeded gusd3CRV pool");

    //
    // Seeding frax3CRV
    //

    const frax3CRVAddress = this.contractAddresses["FRAX3CRV"] as string;

    await waitForTransaction(frax.mint(frax3CRVAddress, WAD.mul(10 ** 6)));
    await waitForTransaction(_3crv.transfer(frax3CRVAddress, WAD.mul(10 ** 6)));

    this.log.info("Seeded FRAX3CRV pool");

    //
    // Seeding gusd3CRV
    //

    const lusd3CRVAddress = this.contractAddresses["LUSD3CRV"] as string;

    await waitForTransaction(lusd.mint(lusd3CRVAddress, WAD.mul(10 ** 6)));
    await waitForTransaction(_3crv.transfer(lusd3CRVAddress, WAD.mul(10 ** 6)));

    this.log.info("Seeded LUSD3CRV pool");
  }

  async deployConvex() {
    this.log.debug("Deploying KovanConvexManager");
    const convexManager = await deploy<KovanConvexManager>(
      "KovanConvexManager",
      this.log,
      SYNCER,
      tokenDataByNetwork.Kovan.CRV
    );

    this.verifier.addContract({
      address: convexManager.address,
      constructorArguments: [SYNCER, tokenDataByNetwork.Kovan.CRV],
    });

    this.contractAddresses["KOVAN_CONVEX_MANAGER"] = convexManager.address;

    this.log.info(
      `KovanConvexManager was deployed at ${convexManager.address}`
    );

    const boosterAddr = await convexManager.booster();
    const cvxAddr = await convexManager.cvx();

    this.verifier.addContract({
      address: boosterAddr,
      constructorArguments: [cvxAddr, tokenDataByNetwork.Kovan.CRV],
    });

    this.verifier.addContract({
      address: cvxAddr,
      constructorArguments: [],
    });

    this.contractAddresses["CONVEX_BOOSTER"] = boosterAddr;
    this.contractAddresses["CVX"] = cvxAddr;

    this.log.info(`Convex Booster mock was deployed at ${boosterAddr}`);
    this.log.info(`CVX token mock was deployed at ${cvxAddr}`);

    this.log.info("Adding pools");

    const tokenList: ConvexLPToken[] = [
      "cvx3Crv",
      "cvxsteCRV",
      "cvxcrvPlain3andSUSD",
      "cvxFRAX3CRV",
      "cvxgusd3CRV",
    ];

    const crvToken = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.CRV,
      this.deployer
    );

    for (let poolToken of tokenList) {
      // DEPLOY BASE POOL

      this.log.debug("Pool:", poolToken);
      const convexData = convexTokens[poolToken] as ConvexLPTokenData;

      const crvTknAddress = this.contractAddresses[
        convexData.underlying
      ] as string;

      const crvTkn = ERC20Kovan__factory.connect(crvTknAddress, this.deployer);

      this.log.debug("Minting");
      await waitForTransaction(crvToken.mint(this.deployer.address, RAY));

      this.log.debug("Approving: [1/2]");
      await waitForTransaction(crvTkn.approve(convexManager.address, RAY));

      this.log.debug("Approving: [2/2]");
      await waitForTransaction(crvToken.approve(convexManager.address, RAY));

      this.log.debug("Adding base pool with pid:", convexData.pid);
      await waitForTransaction(
        convexManager.addBasePool(crvTkn.address, convexData.pid)
      );

      const numPools = await convexManager.deployedPoolsLength();
      const poolAddress = await convexManager.deployedPools(numPools.sub(1));

      const basePool = BaseRewardPool__factory.connect(
        poolAddress,
        this.deployer
      );

      const pid = convexData.pid;
      const stakingToken = await basePool.stakingToken();
      const rewardToken = crvToken.address;
      const operator = await convexManager.booster();
      const manager = convexManager.address;

      this.verifier.addContract({
        address: poolAddress,
        constructorArguments: [
          pid,
          stakingToken,
          rewardToken,
          operator,
          manager,
        ],
      });

      const stakingTokenName = `Convex ${await crvTkn.name()}`;
      const stakingTokenSymbol = poolToken;

      this.verifier.addContract({
        address: stakingToken,
        constructorArguments: [stakingTokenName, stakingTokenSymbol, 18],
      });

      this.log.info(`Pool for ${poolToken} deployed at: ${poolAddress}`);
      this.log.info(`${poolToken} token deployed at: ${stakingToken}`);

      this.contractAddresses[poolToken] = stakingToken;
      this.contractAddresses[convexData.pool] = poolAddress;

      // SYNC BASE POOL

      const mainnetPool = BaseRewardPool__factory.connect(
        contractsByNetwork.Mainnet[convexData.pool],
        this.mainnetProvider
      );

      const mainnetRewardStored = await mainnetPool.rewardPerTokenStored();

      await waitForTransaction(
        convexManager.syncPool(
          poolAddress,
          await mainnetPool.periodFinish(),
          await mainnetPool.rewardRate(),
          await mainnetPool.lastUpdateTime(),
          mainnetRewardStored,
          await mainnetPool.queuedRewards(),
          await mainnetPool.currentRewards(),
          await mainnetPool.historicalRewards()
        )
      );

      this.log.info(
        `Synced Convex pool for ${poolToken} - rewardPerTokenStored: ${mainnetRewardStored}`
      );

      // DEPLOY AND SYNC EXTRA REWARDS

      for (let extraRewardToken of convexExtraRewardTokens[convexData.pool]) {
        const rewardTokenAddr = tokenDataByNetwork.Kovan[extraRewardToken];
        await waitForTransaction(
          convexManager.addExtraPool(rewardTokenAddr, basePool.address)
        );

        const numRewards = await basePool.extraRewardsLength();
        const extraPoolAddr = await basePool.extraRewards(numRewards.sub(1));

        this.log.info(
          `Deployed extra reward pool for reward
                    token ${extraRewardToken} and base pool ${convexData.pool}
                    at address ${extraPoolAddr}`
        );

        this.verifier.addContract({
          address: extraPoolAddr,
          constructorArguments: [
            basePool.address,
            rewardTokenAddr,
            boosterAddr,
            convexManager.address,
          ],
        });

        const mainnetExtraPoolAddr = await mainnetPool.extraRewards(
          numRewards.sub(1)
        );

        const mainnetExtraPool = VirtualBalanceRewardPool__factory.connect(
          mainnetExtraPoolAddr,
          this.mainnetProvider
        );

        const mainnetExtraRewardAddr = await mainnetExtraPool.rewardToken();

        const mainnetExtraReward = ERC20Kovan__factory.connect(
          mainnetExtraRewardAddr,
          this.mainnetProvider
        );

        const mainnetExtraRewardSymbol = await mainnetExtraReward.symbol();

        if (mainnetExtraRewardSymbol != extraRewardToken) {
          throw `Mainnet and testnet extra reward tokens inconsistent: ${mainnetExtraRewardSymbol} and ${extraRewardToken}`;
        }

        const mainnetExtraRewardStored =
          await mainnetExtraPool.rewardPerTokenStored();

        await waitForTransaction(
          convexManager.syncPool(
            extraPoolAddr,
            await mainnetExtraPool.periodFinish(),
            await mainnetExtraPool.rewardRate(),
            await mainnetExtraPool.lastUpdateTime(),
            mainnetExtraRewardStored,
            await mainnetExtraPool.queuedRewards(),
            await mainnetExtraPool.currentRewards(),
            await mainnetExtraPool.historicalRewards()
          )
        );

        this.log.info(
          `Synced Convex extra pool for ${extraRewardToken} - rewardPerTokenStored: ${mainnetExtraRewardStored}`
        );
      }
    }

    const claimZap = await deploy<ClaimZap>(
      "ClaimZap",
      this.log,
      tokenDataByNetwork.Kovan.CRV,
      cvxAddr
    );

    this.verifier.addContract({
      address: claimZap.address,
      constructorArguments: [tokenDataByNetwork.Kovan.CRV, cvxAddr],
    });

    this.log.info(`ClaimZap was deployed at ${claimZap.address}`);

    this.contractAddresses["CONVEX_CLAIM_ZAP"] = claimZap.address;
  }

  async deployYearn() {
    for (let yearnToken of yearnTokenList) {
      const underlying = yearnTokens[yearnToken].underlying;
      const underlyingAddress = this.contractAddresses[underlying]
        ? this.contractAddresses[underlying]
        : tokenDataByNetwork.Kovan[underlying];

      const symbol = yearnTokens[yearnToken].name;
      const vault = await deploy<YearnMock>(
        "YearnMock",
        this.log,
        SYNCER,
        underlyingAddress,
        symbol
      );

      this.log.info(
        `Yearn vault for ${underlying} deployed at: ${vault.address}`
      );

      this.verifier.addContract({
        address: vault.address,
        constructorArguments: [SYNCER, underlyingAddress, symbol],
      });

      this.contractAddresses[yearnToken] = vault.address;

      const mainnetVault = IYVault__factory.connect(
        tokenDataByNetwork.Mainnet[yearnToken],
        this.mainnetProvider
      );

      const mainnetPPS = await mainnetVault.pricePerShare();

      await waitForTransaction(vault.setPricePerShare(mainnetPPS));

      this.log.info(
        `Yearn vault for ${underlying} synced - pricePerShare: ${mainnetPPS}`
      );
    }
  }

  saveProgress(entity: SupportedEntity, address: string) {
    this.contractAddresses[entity] = address;
    fs.writeFileSync(
      PROGRESS_FILE_NAME,
      JSON.stringify(this.contractAddresses)
    );
  }
}

const kovanPlaygroundDeployer = new KovanPlaygroundDeplooyer();
kovanPlaygroundDeployer
  .deployMocks()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
