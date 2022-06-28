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
  ConvexStakedPositionToken,
  LidoV1Gateway,
  CurveV1StETHPoolGateway,
} from "@gearbox-protocol/sdk";
import { providers, BigNumber } from "ethers";
import fs from "fs";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_UNIT = BigNumber.from(10 ** 6);
const GUSD_UNIT = BigNumber.from(10 ** 2);

type SupportedEntity =
  | SupportedToken
  | SupportedContract
  | "CURVE_STECRV_POOL"
  | "KOVAN_CONVEX_MANAGER";

type AddressList = Partial<Record<SupportedEntity, string>>;

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

async function deployLido(
  deployer: SignerWithAddress,
  log: Logger,
  verifier: Verifier,
  contractAddresses: AddressList,
  mainnetProvider: SignerOrProvider
) {
  const lido = await deploy<Lido>("Lido", log, SYNCER);

  log.info(`Lido mock deployed at: ${lido.address}`);

  verifier.addContract({
    address: lido.address,
    constructorArguments: [SYNCER],
  });

  contractAddresses["STETH"] = lido.address;

  const mainnetLido = Lido__factory.connect(
    tokenDataByNetwork.Mainnet.STETH,
    mainnetProvider
  );

  const totalPooledEther = await mainnetLido.getTotalPooledEther();
  const totalShares = await mainnetLido.getTotalShares();

  waitForTransaction(lido.syncExchangeRate(totalPooledEther, totalShares));

  log.info(
    `Lido mock synced - totalPooledEther: ${totalPooledEther}, totalShares: ${totalShares}`
  );

  const lidoGateway = await deploy<LidoV1Gateway>(
    "LidoV1Gateway",
    log,
    tokenDataByNetwork.Kovan.WETH,
    lido.address
  );

  log.info(`Lido gateway deployed at: ${lidoGateway.address}`);

  verifier.addContract({
    address: lidoGateway.address,
    constructorArguments: [tokenDataByNetwork.Kovan.WETH, lido.address],
  });

  contractAddresses["LIDO_STETH_GATEWAY"] = lidoGateway.address;
}

async function deployCurve(
  deployer: SignerWithAddress,
  log: Logger,
  verifier: Verifier,
  contractAddresses: AddressList,
  mainnetProvider: SignerOrProvider
) {
  ///
  /// 3POOL DEPLOYMENT
  ///

  let tokenSymbol: CurveLPToken = "3Crv";
  let poolType: CurvePoolContract | "CURVE_STECRV_POOL" = "CURVE_3CRV_POOL";

  let coins = [
    tokenDataByNetwork.Kovan.DAI,
    tokenDataByNetwork.Kovan.USDC,
    tokenDataByNetwork.Kovan.USDT,
  ];

  let tokenConstructorArgs = ["Curve DAI/USDC/USDT LP Token", tokenSymbol, 18];

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

  await waitForTransaction(_3pool_token.set_minter(_3pool.address));

  log.info(`3pool token mock was deployed at at ${_3pool_token.address}`);
  log.info(`3pool mock was deployed at at ${_3pool.address}`);

  contractAddresses[tokenSymbol] = _3pool_token.address;
  contractAddresses[poolType] = _3pool.address;

  const mainnet3pool = ICurvePool__factory.connect(
    contractsByNetwork.Mainnet[poolType],
    mainnetProvider
  );

  let virtualPrice = await mainnet3pool.get_virtual_price();
  let a = await mainnet3pool.A();

  waitForTransaction(_3pool.sync_pool(virtualPrice, a));

  log.info(`3pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`);

  ///
  /// STECRV DEPLOYMENT
  ///

  tokenSymbol = "steCRV";
  poolType = "CURVE_STECRV_POOL";

  coins = [ETH_ADDRESS, tokenDataByNetwork.Kovan.STETH];

  tokenConstructorArgs = ["Curve STETH/ETH LP Token", tokenSymbol, 18];

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

  await waitForTransaction(steCRV_token.set_minter(steCRV.address));

  log.info(`steCRV token mock was deployed at at ${steCRV_token.address}`);
  log.info(`steCRV mock was deployed at at ${steCRV.address}`);

  contractAddresses[tokenSymbol] = steCRV_token.address;
  contractAddresses[poolType] = steCRV.address;

  const mainnetSteCRV_address = (
    contractParams.CURVE_STETH_GATEWAY as CurveSteCRVPoolParams
  ).pool.Mainnet;

  const mainnetSteCRV = ICurvePool__factory.connect(
    mainnetSteCRV_address,
    mainnetProvider
  );

  virtualPrice = await mainnetSteCRV.get_virtual_price();
  a = await mainnetSteCRV.A();

  waitForTransaction(steCRV.sync_pool(virtualPrice, a));

  log.info(
    `steCRV pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
  );

  const steCRVGateway = await deploy<CurveV1StETHPoolGateway>(
    "CurveV1StETHPoolGateway",
    log,
    tokenDataByNetwork.Kovan.WETH,
    contractAddresses["STETH"] as string,
    steCRV.address
  );

  verifier.addContract({
    address: steCRVGateway.address,
    constructorArguments: [
      tokenDataByNetwork.Kovan.WETH,
      contractAddresses["STETH"] as string,
      steCRV.address,
    ],
  });

  log.info(`steCRV gateway was deployed at ${steCRVGateway.address}`);

  contractAddresses["CURVE_STETH_GATEWAY"] = steCRVGateway.address;

  ///
  /// CURVE SUSD DEPLOYMENT
  ///

  tokenSymbol = "crvPlain3andSUSD";
  poolType = "CURVE_SUSD_POOL";

  coins = [
    tokenDataByNetwork.Kovan.DAI,
    tokenDataByNetwork.Kovan.USDC,
    tokenDataByNetwork.Kovan.USDT,
    tokenDataByNetwork.Kovan.sUSD,
  ];

  tokenConstructorArgs = ["Curve DAI/USDC/USDC/SUSD LP Token", tokenSymbol, 18];

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

  await waitForTransaction(sCRV_token.set_minter(sCRV.address));

  log.info(`Curve SUSD token mock was deployed at at ${sCRV_token.address}`);
  log.info(`Curve SUSD mock was deployed at at ${sCRV.address}`);
  log.info(`Curve SUSD deposit was deployed at ${sCRV_deposit.address}`);

  contractAddresses[tokenSymbol] = sCRV_token.address;
  contractAddresses[poolType] = sCRV.address;
  contractAddresses["CURVE_SUSD_DEPOSIT"] = sCRV_deposit.address;

  const mainnetSCRV = ICurvePool__factory.connect(
    contractsByNetwork.Mainnet[poolType],
    mainnetProvider
  );

  virtualPrice = await mainnetSCRV.get_virtual_price();
  a = await mainnetSCRV.A();

  waitForTransaction(sCRV.sync_pool(virtualPrice, a));

  log.info(
    `SUSD pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
  );

  ///
  /// CURVE GUSD3CRV DEPLOYMENT
  ///

  tokenSymbol = "gusd3CRV";
  poolType = "CURVE_GUSD_POOL";

  coins = [tokenDataByNetwork.Kovan.GUSD, _3pool_token.address];

  tokenConstructorArgs = ["gusd3CRV Token", tokenSymbol, 18];

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

  await waitForTransaction(gusd_token.set_minter(gusd.address));

  log.info(
    `Curve gusd3CRV token mock was deployed at at ${gusd_token.address}`
  );
  log.info(`Curve gusd3CRV mock was deployed at at ${gusd.address}`);

  contractAddresses[tokenSymbol] = gusd_token.address;
  contractAddresses[poolType] = gusd.address;

  const mainnetGusd3CRV = ICurvePool__factory.connect(
    contractsByNetwork.Mainnet[poolType],
    mainnetProvider
  );

  virtualPrice = await mainnetGusd3CRV.get_virtual_price();
  a = await mainnetGusd3CRV.A();

  waitForTransaction(gusd.sync_pool(virtualPrice, a));

  log.info(
    `GUSD pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
  );

  ///
  /// CURVE FRAX3CRV DEPLOYMENT
  ///

  tokenSymbol = "FRAX3CRV";

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

  let symbol = await frax3crv.symbol();

  if (symbol != `${tokenSymbol}-f`) {
    throw `Incorrect metapool symbol: ${symbol} should be ${`${tokenSymbol}-f`}`;
  }

  log.info(
    `Curve FRAX3CRV mock (implements ERC20) was deployed at at ${frax3crv.address}`
  );

  contractAddresses[tokenSymbol] = frax3crv.address;

  const mainnetFRAX3CRV = ICurvePool__factory.connect(
    tokenDataByNetwork.Mainnet[tokenSymbol],
    mainnetProvider
  );

  virtualPrice = await mainnetFRAX3CRV.get_virtual_price();
  a = await mainnetFRAX3CRV.A();

  waitForTransaction(frax3crv.sync_pool(virtualPrice, a));

  log.info(
    `FRAX3CRV pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
  );

  ///
  /// CURVE LUSD3CRV DEPLOYMENT
  ///

  tokenSymbol = "LUSD3CRV";

  coins = [tokenDataByNetwork.Kovan.LUSD, _3pool_token.address];

  poolConstructorArgs = [
    SYNCER,
    "LUSD",
    "LUSD",
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

  symbol = await lusd3crv.symbol();

  if (symbol != `${tokenSymbol}-f`) {
    throw `Incorrect metapool symbol: ${symbol} should be ${`${tokenSymbol}-f`}`;
  }

  log.info(
    `Curve LUSD3CRV mock (implements ERC20) was deployed at at ${lusd3crv.address}`
  );

  contractAddresses[tokenSymbol] = lusd3crv.address;

  const mainnetLUSD3CRV = ICurvePool__factory.connect(
    tokenDataByNetwork.Mainnet[tokenSymbol],
    mainnetProvider
  );

  virtualPrice = await mainnetLUSD3CRV.get_virtual_price();
  a = await mainnetLUSD3CRV.A();

  waitForTransaction(lusd3crv.sync_pool(virtualPrice, a));

  log.info(
    `LUSD3CRV pool synced with params - virtualPrice: ${virtualPrice}, A: ${a}`
  );
}

async function seedCurve(
  deployer: SignerWithAddress,
  log: Logger,
  contractAddresses: AddressList
) {
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
    contractAddresses["3Crv"] as string,
    deployer
  );

  const steth = Lido__factory.connect(
    contractAddresses["STETH"] as string,
    deployer
  );

  //
  // Seed 3Pool
  //

  const _3poolAddress = contractAddresses["CURVE_3CRV_POOL"] as string;

  await waitForTransaction(dai.mint(_3poolAddress, WAD.mul(10 ** 9)));
  await waitForTransaction(usdc.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(usdt.mint(_3poolAddress, USDC_UNIT.mul(10 ** 9)));

  await waitForTransaction(dai.mint(deployer.address, WAD.mul(10 ** 7)));
  await waitForTransaction(usdc.mint(deployer.address, USDC_UNIT.mul(10 ** 7)));
  await waitForTransaction(usdt.mint(deployer.address, USDC_UNIT.mul(10 ** 7)));

  const _3pool = Curve3PoolMock__factory.connect(
    _3poolAddress,
    deployer.address
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

  log.info("Seeded 3CRV and added liquidity");

  //
  // Seeding SUSD
  //

  const sCRV_address = contractAddresses["CURVE_SUSD_POOL"] as string;

  await waitForTransaction(dai.mint(sCRV_address, WAD.mul(10 ** 9)));
  await waitForTransaction(usdc.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(usdt.mint(sCRV_address, USDC_UNIT.mul(10 ** 9)));
  await waitForTransaction(susd.mint(sCRV_address, WAD.mul(10 ** 9)));

  log.info("Seeded SUSD pool");

  //
  // Seeding steCRV
  //

  const steCRV_address = contractAddresses["CURVE_STECRV_POOL"] as string;

  const steCRV = CurveStETHMock__factory.connect(steCRV_address, deployer);

  await waitForTransaction(steth.mint(steCRV_address, WAD.mul(1500)));
  await waitForTransaction(steCRV.donate_eth({ value: WAD.mul(1500) }));

  log.info("Seeded steCRV pool");

  //
  // Seeding gusd3CRV
  //

  const gusd3CRVAddress = contractAddresses["CURVE_GUSD_POOL"] as string;

  await waitForTransaction(gusd.mint(gusd3CRVAddress, GUSD_UNIT.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(gusd3CRVAddress, WAD.mul(10 ** 6)));

  log.info("Seeded gusd3CRV pool");

  //
  // Seeding frax3CRV
  //

  const frax3CRVAddress = contractAddresses["FRAX3CRV"] as string;

  await waitForTransaction(frax.mint(frax3CRVAddress, WAD.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(frax3CRVAddress, WAD.mul(10 ** 6)));

  log.info("Seeded FRAX3CRV pool");

  //
  // Seeding gusd3CRV
  //

  const lusd3CRVAddress = contractAddresses["LUSD3CRV"] as string;

  await waitForTransaction(lusd.mint(lusd3CRVAddress, WAD.mul(10 ** 6)));
  await waitForTransaction(_3crv.transfer(lusd3CRVAddress, WAD.mul(10 ** 6)));

  log.info("Seeded LUSD3CRV pool");
}

async function deployConvex(
  deployer: SignerWithAddress,
  log: Logger,
  verifier: Verifier,
  contractAddresses: AddressList,
  mainnetProvider: SignerOrProvider
) {
  const convexManager = await deploy<KovanConvexManager>(
    "KovanConvexManager",
    log,
    SYNCER,
    tokenDataByNetwork.Kovan.CRV
  );

  verifier.addContract({
    address: convexManager.address,
    constructorArguments: [SYNCER, tokenDataByNetwork.Kovan.CRV],
  });

  contractAddresses["KOVAN_CONVEX_MANAGER"] = convexManager.address;

  log.info(`KovanConvexManager was deployed at ${convexManager.address}`);

  const boosterAddr = await convexManager.booster();
  const cvxAddr = await convexManager.cvx();

  verifier.addContract({
    address: boosterAddr,
    constructorArguments: [cvxAddr, tokenDataByNetwork.Kovan.CRV],
  });

  verifier.addContract({
    address: cvxAddr,
    constructorArguments: [],
  });

  contractAddresses["CONVEX_BOOSTER"] = boosterAddr;
  contractAddresses["CVX"] = cvxAddr;

  log.info(`Convex Booster mock was deployed at ${boosterAddr}`);
  log.info(`CVX token mock was deployed at ${cvxAddr}`);

  log.info("Adding pools");

  const tokenList: ConvexLPToken[] = [
    "cvx3Crv",
    "cvxsteCRV",
    "cvxcrvPlain3andSUSD",
    "cvxFRAX3CRV",
    "cvxgusd3CRV",
  ];

  const crvToken = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.CRV,
    deployer
  );

  for (let poolToken of tokenList) {
    // DEPLOY BASE POOL

    log.debug("Pool:", poolToken);
    const convexData = convexTokens[poolToken] as ConvexLPTokenData;

    const crvTknAddress = contractAddresses[convexData.underlying] as string;

    const crvTkn = ERC20Kovan__factory.connect(crvTknAddress, deployer);

    log.debug("Minting");
    await waitForTransaction(crvToken.mint(deployer.address, RAY));

    log.debug("Approving: [1/2]");
    await waitForTransaction(crvTkn.approve(convexManager.address, RAY));

    log.debug("Approving: [2/2]");
    await waitForTransaction(crvToken.approve(convexManager.address, RAY));

    log.debug("Adding base pool with pid:", convexData.pid);
    await waitForTransaction(
      convexManager.addBasePool(crvTkn.address, convexData.pid)
    );

    const numPools = await convexManager.deployedPoolsLength();
    const poolAddress = await convexManager.deployedPools(numPools.sub(1));

    const basePool = BaseRewardPool__factory.connect(poolAddress, deployer);

    const pid = convexData.pid;
    const stakingToken = await basePool.stakingToken();
    const rewardToken = crvToken.address;
    const operator = await convexManager.booster();
    const manager = convexManager.address;

    verifier.addContract({
      address: poolAddress,
      constructorArguments: [pid, stakingToken, rewardToken, operator, manager],
    });

    const stakingTokenName = `Convex ${await crvTkn.name()}`;
    const stakingTokenSymbol = poolToken;

    verifier.addContract({
      address: stakingToken,
      constructorArguments: [stakingTokenName, stakingTokenSymbol, 18],
    });

    log.info(`Pool for ${poolToken} deployed at: ${poolAddress}`);
    log.info(`${poolToken} token deployed at: ${stakingToken}`);

    contractAddresses[poolToken] = stakingToken;
    contractAddresses[convexData.pool] = poolAddress;

    // SYNC BASE POOL

    const mainnetPool = BaseRewardPool__factory.connect(
      contractsByNetwork.Mainnet[convexData.pool],
      mainnetProvider
    );

    const mainnetRewardStored = await mainnetPool.rewardPerTokenStored();

    waitForTransaction(
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

    log.info(
      `Synced Convex pool for ${poolToken} - rewardPerTokenStored: ${mainnetRewardStored}`
    );

    // DEPLOY STAKED PHANTOM TOKEN

    // TODO: CHECK WHETHER THIS ACTUALLY WORKS
    const phantomToken = await deploy<ConvexStakedPositionToken>(
      "ConvexStakedPositionToken",
      log,
      poolAddress,
      stakingToken
    );

    log.info(
      `Staked phantom token for ${poolToken} deployed at: ${phantomToken.address}`
    );

    verifier.addContract({
      address: phantomToken.address,
      constructorArguments: [poolAddress, stakingToken],
    });

    const phantomTokenSymbol =
      (await phantomToken.symbol()) as ConvexStakedPhantomToken;

    contractAddresses[phantomTokenSymbol] = phantomToken.address;

    // DEPLOY AND SYNC EXTRA REWARDS

    for (let extraRewardToken of convexExtraRewardTokens[convexData.pool]) {
      const rewardTokenAddr = tokenDataByNetwork.Kovan[extraRewardToken];
      waitForTransaction(
        convexManager.addExtraPool(rewardTokenAddr, basePool.address)
      );

      const numRewards = await basePool.extraRewardsLength();
      const extraPoolAddr = await basePool.extraRewards(numRewards.sub(1));

      log.info(
        `Deployed extra reward pool for reward
              token ${extraRewardToken} and base pool ${convexData.pool}
              at address ${extraPoolAddr}`
      );

      verifier.addContract({
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
        mainnetProvider
      );

      const mainnetExtraRewardAddr = await mainnetExtraPool.rewardToken();

      const mainnetExtraReward = ERC20Kovan__factory.connect(
        mainnetExtraRewardAddr,
        mainnetProvider
      );

      const mainnetExtraRewardSymbol = await mainnetExtraReward.symbol();

      if (mainnetExtraRewardSymbol != extraRewardToken) {
        throw `Mainnet and testnet extra reward tokens inconsistent: ${mainnetExtraRewardSymbol} and ${extraRewardToken}`;
      }

      const mainnetExtraRewardStored =
        await mainnetExtraPool.rewardPerTokenStored();

      waitForTransaction(
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

      log.info(
        `Synced Convex extra pool for ${extraRewardToken} - rewardPerTokenStored: ${mainnetExtraRewardStored}`
      );
    }
  }

  const claimZap = await deploy<ClaimZap>(
    "ClaimZap",
    log,
    tokenDataByNetwork.Kovan.CRV,
    cvxAddr
  );

  verifier.addContract({
    address: claimZap.address,
    constructorArguments: [tokenDataByNetwork.Kovan.CRV, cvxAddr],
  });

  log.info(`ClaimZap was deployed at ${claimZap.address}`);

  contractAddresses["CONVEX_CLAIM_ZAP"] = claimZap.address;
}

async function deployYearn(
  deployer: SignerWithAddress,
  log: Logger,
  verifier: Verifier,
  contractAddresses: AddressList,
  mainnetProvider: SignerOrProvider
) {
  for (let yearnToken of yearnTokenList) {
    const underlying = yearnTokens[yearnToken].underlying;
    const underlyingAddress = contractAddresses[underlying]
      ? contractAddresses[underlying]
      : tokenDataByNetwork.Kovan[underlying];

    const symbol = yearnTokens[yearnToken].name;

    const vault = await deploy<YearnMock>(
      "YearnMock",
      log,
      SYNCER,
      underlyingAddress,
      symbol
    );

    log.info(`Yearn vault for ${underlying} deployed at: ${vault.address}`);

    verifier.addContract({
      address: vault.address,
      constructorArguments: [SYNCER, underlyingAddress, symbol],
    });

    contractAddresses[yearnToken] = vault.address;

    const mainnetVault = IYVault__factory.connect(
      tokenDataByNetwork.Mainnet[yearnToken],
      mainnetProvider
    );

    const mainnetPPS = await mainnetVault.pricePerShare();

    waitForTransaction(vault.setPricePerShare(mainnetPPS));

    log.info(
      `Yearn vault for ${underlying} synced - pricePerShare: ${mainnetPPS}`
    );
  }
}

async function deployMocks() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();
  const verifier: Verifier = new Verifier();

  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  const mainnetProvider = new providers.JsonRpcProvider(
    mainnetRpc
  ) as SignerOrProvider;

  log.info(`Deployer: ${deployer.address}`);

  if (chainId !== 42 && chainId !== 1337)
    throw new Error("Switch to Kovan network");

  let contractAddresses: AddressList = {};

  await deployLido(deployer, log, verifier, contractAddresses, mainnetProvider);

  await deployCurve(
    deployer,
    log,
    verifier,
    contractAddresses,
    mainnetProvider
  );

  await seedCurve(deployer, log, contractAddresses);

  await deployConvex(
    deployer,
    log,
    verifier,
    contractAddresses,
    mainnetProvider
  );

  await deployYearn(
    deployer,
    log,
    verifier,
    contractAddresses,
    mainnetProvider
  );

  fs.writeFileSync("./mockAddresses.json", JSON.stringify(contractAddresses));

  log.info(contractAddresses);
}

deployMocks()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
