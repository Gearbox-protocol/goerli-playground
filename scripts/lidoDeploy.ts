// @ts-ignore
// @ts-ignore
import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import {
  contractParams,
  LidoParams,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { Lido, Lido__factory, LidoOracle, LidoOracle__factory } from "../types";
import { AbstractDeployer } from "./abstractDeployer";
import { SYNCER } from "./constants";

export class LidoDeployer extends AbstractDeployer {
  async deploy() {
    if (this.isDeployNeeded("STETH")) {
      const lido = await deploy<Lido>("Lido", this.log, SYNCER);

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
        SYNCER
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
        constructorArguments: [SYNCER],
      });

      this.verifier.addContract({
        address: lido.address,
        constructorArguments: [SYNCER],
      });

      this.saveProgress("LIDO_ORACLE", lidoOracle.address);
      this.saveProgress("STETH", lido.address);

      this.log.info(
        `Lido oracle mock synced -
        postTotalPooledEther: ${oracleData.postTotalPooledEther},
        preTotalPooledEther: ${oracleData.preTotalPooledEther},
        timeElapsed: ${oracleData.timeElapsed}`
      );
    }
  }
}
