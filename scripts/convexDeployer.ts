import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractsByNetwork,
  ConvexLPToken,
  ConvexLPTokenData,
  ConvexPoolContract,
  convexTokens,
  MultiCallContract,
  RAY,
  SupportedToken,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import {
  BaseRewardPool__factory,
  ClaimZap,
  ERC20Kovan__factory,
  KovanConvexManager,
  KovanConvexManager__factory,
  VirtualBalanceRewardPool__factory,
} from "../types";
import { BaseRewardPoolInterface } from "../types/BaseRewardPool";
import { AbstractDeployer } from "./abstractDeployer";
import { SYNCER } from "./constants";

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

const tokenList: ConvexLPToken[] = [
  "cvx3Crv",
  "cvxsteCRV",
  "cvxcrvPlain3andSUSD",
  "cvxFRAX3CRV",
  "cvxgusd3CRV",
];

export class ConvexDeployer extends AbstractDeployer {
  _convexManager: KovanConvexManager | undefined;

  async deploy() {
    this.log.debug("Deploying KovanConvexManager");

    await this.deployManager();

    this._convexManager = KovanConvexManager__factory.connect(
      this.getProgressOrThrow("KOVAN_CONVEX_MANAGER"),
      this.deployer
    );

    this.log.info("Adding pools");

    await this.deployPools();

    await this.deployClaimZap();
  }

  async deployManager() {
    if (this.isDeployNeeded("KOVAN_CONVEX_MANAGER")) {
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

      this.saveProgress("KOVAN_CONVEX_MANAGER", convexManager.address);

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

      this.saveProgress("CONVEX_BOOSTER", boosterAddr);
      this.saveProgress("CVX", cvxAddr);

      this.log.info(`Convex Booster mock was deployed at ${boosterAddr}`);
      this.log.info(`CVX token mock was deployed at ${cvxAddr}`);
    }
  }

  async deployPools() {

    for (let poolToken of tokenList) {
      // DEPLOY BASE POOL
      if (this.isDeployNeeded(poolToken)) {
        await this.deployPool(poolToken);
      }
    }
  }

  async deployPool(poolToken: ConvexLPToken) {
    this.log.debug("Pool:", poolToken);
    const convexData = convexTokens[poolToken] as ConvexLPTokenData;

    const curveUnderlyingTokenAddress = this.getProgressOrThrow(
      convexData.underlying
    );

    const crvToken = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan.CRV,
      this.deployer
    );

    const curveUnderlyingToken = ERC20Kovan__factory.connect(
      curveUnderlyingTokenAddress,
      this.deployer
    );

    this.log.debug("Minting");
    await waitForTransaction(crvToken.mint(this.deployer.address, RAY));

    this.log.debug("Approving: [1/2]");
    await waitForTransaction(
      curveUnderlyingToken.approve(this.convexManager.address, RAY)
    );

    this.log.debug("Approving: [2/2]");
    await waitForTransaction(crvToken.approve(this.convexManager.address, RAY));

    this.log.debug("Adding base pool with pid:", convexData.pid);
    await waitForTransaction(
      this.convexManager.addBasePool(
        curveUnderlyingToken.address,
        convexData.pid
      )
    );

    const numPools = await this.convexManager.deployedPoolsLength();
    const poolAddress = await this.convexManager.deployedPools(numPools.sub(1));

    const basePool = BaseRewardPool__factory.connect(
      poolAddress,
      this.deployer
    );

    const pid = convexData.pid;
    const stakingToken = await basePool.stakingToken();
    const rewardToken = crvToken.address;
    const operator = await this.convexManager.booster();
    const manager = this.convexManager.address;

    this.verifier.addContract({
      address: poolAddress,
      constructorArguments: [pid, stakingToken, rewardToken, operator, manager],
    });

    const stakingTokenName = `Convex ${await curveUnderlyingToken.name()}`;
    const stakingTokenSymbol = poolToken;

    this.verifier.addContract({
      address: stakingToken,
      constructorArguments: [stakingTokenName, stakingTokenSymbol, 18],
    });

    this.log.info(`Pool for ${poolToken} deployed at: ${poolAddress}`);
    this.log.info(`${poolToken} token deployed at: ${stakingToken}`);

    this.saveProgress(poolToken, stakingToken);
    this.saveProgress(convexData.pool, poolAddress);

    // SYNC BASE POOL

    const mainnetPool = BaseRewardPool__factory.connect(
      contractsByNetwork.Mainnet[convexData.pool],
      this.mainnetProvider
    );

    await this.syncPool(
      poolAddress,
      contractsByNetwork.Mainnet[convexData.pool],
      poolToken,
      false
    );

    // DEPLOY AND SYNC EXTRA REWARDS

    for (let extraRewardToken of convexExtraRewardTokens[convexData.pool]) {
      const rewardTokenAddr = tokenDataByNetwork.Kovan[extraRewardToken];
      await waitForTransaction(
        this.convexManager.addExtraPool(rewardTokenAddr, basePool.address)
      );

      const numRewards = await basePool.extraRewardsLength();
      const extraPoolAddr = await basePool.extraRewards(numRewards.sub(1));

      this.log.info(
        `Deployed extra reward pool for reward
                  token ${extraRewardToken} and base pool ${convexData.pool}
                  at address ${extraPoolAddr}`
      );

      const boosterAddr = await this.convexManager.booster();

      this.verifier.addContract({
        address: extraPoolAddr,
        constructorArguments: [
          basePool.address,
          rewardTokenAddr,
          boosterAddr,
          this.convexManager.address,
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

      await this.syncPool(
        extraPoolAddr,
        mainnetExtraRewardAddr,
        extraRewardToken,
        true
      );
    }
  }

  async syncPool(
    rewardPool: string,
    mainnetAddress: string,
    token: SupportedToken,
    isExtra: boolean
  ) {
    const multiCallContract = new MultiCallContract(
      mainnetAddress,
      BaseRewardPool__factory.createInterface(),
      this.mainnetProvider
    );

    const paramsToSync: Array<keyof BaseRewardPoolInterface["functions"]> = [
      "periodFinish()",
      "rewardRate()",
      "lastUpdateTime()",
      "rewardPerTokenStored()",
      "queuedRewards()",
      "currentRewards()",
      "historicalRewards()",
    ];

    const [
      periodFinish,
      rewardRate,
      lastUpdateTime,
      rewardPerTokenStored,
      queuedRewards,
      currentRewards,
      historicalRewards,
    ] = await multiCallContract.call(
      paramsToSync.map((method) => ({
        method,
      }))
    );

    await waitForTransaction(
      this.convexManager.syncPool(
        rewardPool,
        periodFinish,
        rewardRate,
        lastUpdateTime,
        rewardPerTokenStored,
        queuedRewards,
        currentRewards,
        historicalRewards
      )
    );

    this.log.info(
      `Sync: Convex ${
        isExtra ? "ExtraRewardPool" : "Pool"
      } for ${token} - rewardPerTokenStored: ${rewardPerTokenStored}`
    );
  }

  async deployClaimZap() {
    const cvxAddr = this.getProgressOrThrow("CVX");

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

    this.saveProgress("CONVEX_CLAIM_ZAP", claimZap.address);
  }

  get convexManager(): KovanConvexManager {
    if (!this._convexManager) throw new Error("ConvexManager is not set");
    return this._convexManager;
  }
}
