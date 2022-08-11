import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractParams,
  LidoParams,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";

import {
  Lido,
  Lido__factory,
  LidoOracle,
  LidoOracle__factory,
} from "../../types";
import { AbstractDeployer } from "../support";

export class LidoDeployer extends AbstractDeployer {
  protected async run(): Promise<void> {
    const needed = await this.progressTracker.isDeployNeeded("lido", "STETH");
    if (!needed) {
      return;
    }

    const lido = await deploy<Lido>("Lido", this.log, this.syncer);

    this.log.info(`Lido mock deployed at: ${lido.address}`);

    const mainnetLido = Lido__factory.connect(
      tokenDataByNetwork.Mainnet.STETH,
      this.mainnetProvider
    );

    const LIDO_MAINNET_ORACLE = (
      contractParams.LIDO_STETH_GATEWAY as LidoParams
    ).oracle.Mainnet;

    const totalPooledEther = await mainnetLido.getTotalPooledEther();
    const totalShares = await mainnetLido.getTotalShares();

    await waitForTransaction(
      lido.syncExchangeRate(totalPooledEther, totalShares)
    );

    this.log.info(
      `Lido mock synced - totalPooledEther: ${totalPooledEther}, totalShares: ${totalShares}`
    );

    this.log.debug("Deploying Lido oracle");

    const lidoOracle = await deploy<LidoOracle>(
      "LidoOracle",
      this.log,
      this.syncer
    );

    this.log.info(`Lido mock deployed at: ${lidoOracle.address}`);

    const mainnetLidoOracle = LidoOracle__factory.connect(
      LIDO_MAINNET_ORACLE,
      this.mainnetProvider
    );

    const oracleData = await mainnetLidoOracle.getLastCompletedReportDelta();

    await waitForTransaction(
      lidoOracle.syncOracle(
        oracleData.postTotalPooledEther,
        oracleData.preTotalPooledEther,
        oracleData.timeElapsed
      )
    );

    this.verifier.addContract({
      address: lidoOracle.address,
      constructorArguments: [this.syncer],
    });

    this.verifier.addContract({
      address: lido.address,
      constructorArguments: [this.syncer],
    });

    this.progressTracker.saveProgress(
      "lido",
      "LIDO_ORACLE",
      lidoOracle.address
    );
    this.progressTracker.saveProgress("lido", "STETH", lido.address);

    this.log.info(
      `Testnet Lido oracle synced -
        postTotalPooledEther: ${oracleData.postTotalPooledEther},
        preTotalPooledEther: ${oracleData.preTotalPooledEther},
        timeElapsed: ${oracleData.timeElapsed}`
    );
  }
}
