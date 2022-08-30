import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractsByNetwork,
  ConvexLPToken,
  ConvexLPTokenData,
  ConvexPoolContract,
  convexTokens,
  MultiCallContract,
  SupportedToken,
} from "@gearbox-protocol/sdk";

import {
  BaseRewardPool__factory,
  ClaimZap,
  ConvexManagerTestnet,
  ConvexManagerTestnet__factory,
  ERC20Testnet__factory,
  VirtualBalanceRewardPool__factory,
} from "../../../types";
import { BaseRewardPoolInterface } from "../../../types/contracts/convex/ConvexBaseRewardPool.sol/BaseRewardPool";
import { AbstractScript } from "../AbstractScript";
import { DeployedToken } from "../types";

const convexExtraRewardTokens: Record<
  ConvexPoolContract,
  Array<DeployedToken>
> = {
  CONVEX_3CRV_POOL: [],
  CONVEX_GUSD_POOL: [],
  CONVEX_SUSD_POOL: ["SNX"],
  CONVEX_STECRV_POOL: ["LDO"],
  CONVEX_FRAX3CRV_POOL: ["FXS"],
  CONVEX_LUSD3CRV_POOL: ["LQTY"],
};

const tokenList: ConvexLPToken[] = [
  "cvx3Crv",
  "cvxsteCRV",
  "cvxcrvPlain3andSUSD",
  "cvxFRAX3CRV",
  "cvxLUSD3CRV",
  "cvxgusd3CRV",
];

export class ConvexDeployer extends AbstractScript {
  private _convexManager?: ConvexManagerTestnet;

  protected async run(): Promise<void> {
    this.log.info("Deploying Convex");

    await this.deployManager();

    const convexMgrAddr = await this.progress.getOrThrow(
      "convex",
      "TESTNET_CONVEX_MANAGER",
    );
    this._convexManager = ConvexManagerTestnet__factory.connect(
      convexMgrAddr,
      this.deployer,
    );

    this.log.info("Adding pools");

    await this.deployPools();

    await this.deployClaimZap();
  }

  private async deployManager(): Promise<void> {
    if (
      await this.progress.isDeployNeeded("convex", "TESTNET_CONVEX_MANAGER")
    ) {
      const crv = await this.progress.getOrThrow("normalTokens", "CRV");

      const convexManager = await this.deploy<ConvexManagerTestnet>(
        "ConvexManagerTestnet",
        this.syncer,
        crv,
      );

      await this.progress.save(
        "convex",
        "TESTNET_CONVEX_MANAGER",
        convexManager.address,
      );

      this.log.info(
        `ConvexManagerTestnet was deployed at ${convexManager.address}`,
      );

      const boosterAddr = await convexManager.booster();
      const cvxAddr = await convexManager.cvx();

      this.verifier.addContract({
        address: boosterAddr,
        constructorArguments: [cvxAddr, crv],
      });

      this.verifier.addContract({
        address: cvxAddr,
        constructorArguments: [this.syncer],
      });

      await this.progress.save("convex", "CONVEX_BOOSTER", boosterAddr);
      await this.progress.save("convex", "CVX", cvxAddr);

      this.log.info(`Convex Booster mock was deployed at ${boosterAddr}`);
      this.log.info(`CVX token mock was deployed at ${cvxAddr}`);
    }
  }

  private async deployPools(): Promise<void> {
    for (const poolToken of tokenList) {
      // DEPLOY BASE POOL
      if (await this.progress.isDeployNeeded("convex", poolToken)) {
        await this.deployPool(poolToken);
      }
    }
  }

  private async deployPool(poolToken: ConvexLPToken): Promise<void> {
    this.log.debug("Pool:", poolToken);
    const crv = await this.progress.getOrThrow("normalTokens", "CRV");
    const convexData = convexTokens[poolToken] as ConvexLPTokenData;

    const curveUnderlyingTokenAddress = await this.progress.getOrThrow(
      "curve",
      convexData.underlying,
    );

    const crvToken = ERC20Testnet__factory.connect(crv, this.deployer);

    const curveUnderlyingToken = ERC20Testnet__factory.connect(
      curveUnderlyingTokenAddress,
      this.deployer,
    );

    await this.mintToken("CRV", this.deployer.address, 10 ** 9);
    await this.approve("CRV", this.convexManager.address);

    this.log.debug("Adding base pool with pid:", convexData.pid);
    await waitForTransaction(
      this.convexManager.addBasePool(
        curveUnderlyingToken.address,
        convexData.pid,
      ),
    );

    const numPools = await this.convexManager.deployedPoolsLength();
    const poolAddress = await this.convexManager.deployedPools(numPools.sub(1));

    const basePool = BaseRewardPool__factory.connect(
      poolAddress,
      this.deployer,
    );

    const pid = convexData.pid;
    const stakingToken = await basePool.stakingToken();
    const rewardToken = crvToken.address;
    const operator = await this.convexManager.booster();
    const manager = this.convexManager.address;

    const stakingTokenName = `Convex ${await curveUnderlyingToken.name()}`;
    const stakingTokenSymbol = poolToken;

    // SYNC BASE POOL

    const mainnetPool = BaseRewardPool__factory.connect(
      contractsByNetwork.Mainnet[convexData.pool],
      this.mainnetProvider,
    );

    await this.syncPool(
      poolAddress,
      contractsByNetwork.Mainnet[convexData.pool],
      poolToken,
      false,
    );

    // DEPLOY AND SYNC EXTRA REWARDS

    for (const extraRewardToken of convexExtraRewardTokens[convexData.pool]) {
      const rewardTokenAddr = await this.progress.getOrThrow(
        "normalTokens",
        extraRewardToken,
      );

      await this.mintToken(extraRewardToken, this.deployer.address, 10 ** 9);
      await this.approve(extraRewardToken, this.convexManager.address);

      this.log.debug(`Adding extra pool ${rewardTokenAddr}`);
      await waitForTransaction(
        this.convexManager.addExtraPool(rewardTokenAddr, basePool.address),
      );

      const numRewards = await basePool.extraRewardsLength();
      const extraPoolAddr = await basePool.extraRewards(numRewards.sub(1));

      this.log.info(`
        Deployed extra reward pool for reward
        token ${extraRewardToken} and base pool ${convexData.pool}
        at address ${extraPoolAddr}
      `);

      await this.progress.save(
        "convex",
        `${convexData.pool}_EXTRA_${extraRewardToken}`,
        extraPoolAddr,
      );

      const boosterAddr = await this.convexManager.booster();

      const mainnetExtraPoolAddr = await mainnetPool.extraRewards(
        numRewards.sub(1),
      );

      const mainnetExtraPool = VirtualBalanceRewardPool__factory.connect(
        mainnetExtraPoolAddr,
        this.mainnetProvider,
      );

      const mainnetExtraRewardAddr = await mainnetExtraPool.rewardToken();

      const mainnetExtraReward = ERC20Testnet__factory.connect(
        mainnetExtraRewardAddr,
        this.mainnetProvider,
      );

      const mainnetExtraRewardSymbol = await mainnetExtraReward.symbol();

      if (mainnetExtraRewardSymbol !== extraRewardToken) {
        throw new Error(
          `Mainnet and testnet extra reward tokens inconsistent: ${mainnetExtraRewardSymbol} and ${extraRewardToken}`,
        );
      }

      await this.syncPool(
        extraPoolAddr,
        mainnetExtraPoolAddr,
        extraRewardToken,
        true,
      );

      this.verifier.addContract({
        address: extraPoolAddr,
        constructorArguments: [
          basePool.address,
          rewardTokenAddr,
          boosterAddr,
          this.convexManager.address,
        ],
      });
    }

    this.verifier.addContract({
      address: poolAddress,
      constructorArguments: [pid, stakingToken, rewardToken, operator, manager],
    });

    this.verifier.addContract({
      address: stakingToken,
      constructorArguments: [stakingTokenName, stakingTokenSymbol, 18],
    });

    await this.progress.save("convex", poolToken, stakingToken);
    await this.progress.save("convex", convexData.pool, poolAddress);

    this.log.info(`Pool for ${poolToken} deployed at: ${poolAddress}`);
    this.log.info(`${poolToken} token deployed at: ${stakingToken}`);
  }

  private async syncPool(
    rewardPool: string,
    mainnetAddress: string,
    token: SupportedToken,
    isExtra: boolean,
  ): Promise<void> {
    const multiCallContract = new MultiCallContract(
      mainnetAddress,
      BaseRewardPool__factory.createInterface(),
      this.mainnetProvider,
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
      paramsToSync.map(method => ({
        method,
      })),
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
        historicalRewards,
      ),
    );

    this.log.info(
      `Sync: Convex ${
        isExtra ? "ExtraRewardPool" : "Pool"
      } for ${token} - rewardPerTokenStored: ${rewardPerTokenStored}`,
    );
  }

  private async deployClaimZap(): Promise<void> {
    const cvxAddr = await this.progress.getOrThrow("convex", "CVX");
    const crvAddr = await this.progress.getOrThrow("normalTokens", "CRV");

    const claimZap = await this.deploy<ClaimZap>("ClaimZap", crvAddr, cvxAddr);

    this.log.info(`ClaimZap was deployed at ${claimZap.address}`);

    await this.progress.save("convex", "CONVEX_CLAIM_ZAP", claimZap.address);
  }

  private get convexManager(): ConvexManagerTestnet {
    if (!this._convexManager) {
      throw new Error("ConvexManager is not set");
    }
    return this._convexManager;
  }
}
