import { run } from "hardhat";

import config from "../config";
import { Syncer } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { AbstractScript } from "./support";

class SyncerDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    let syncerAddr = await this.progressTracker.getProgress(
      "syncer",
      "address"
    );
    if (syncerAddr) {
      this.log.debug(`Syncer already deployed at: ${syncerAddr}`);
    } else {
      const syncer = await deploy<Syncer>("Syncer", this.log);
      await syncer.deployTransaction.wait(config.confirmations);
      await waitForTransaction(syncer.addSyncer(config.syncerRobot));
      await this.progressTracker.saveProgress(
        "syncer",
        "address",
        syncer.address
      );
      syncerAddr = syncer.address;
    }

    if (this.canVerify) {
      await run("verify:verify", {
        address: syncerAddr,
      });
    }
  }
}

new SyncerDeployer().exec();
