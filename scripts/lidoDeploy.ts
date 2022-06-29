// @ts-ignore
// @ts-ignore
import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { Lido, Lido__factory } from "../types";
import { AbstractDeployer } from "./abstractDeployer";
import { SYNCER } from "./constants";

export class LidoDeployer extends AbstractDeployer {
  async deploy() {
    if (this.isDeployNeeded("STETH")) {
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
  }
}
