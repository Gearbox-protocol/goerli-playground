import { run } from "hardhat";

import config from "../config";
import { Syncer } from "../types";
import { deploy, waitForTransaction } from "../utils/transaction";
import { AbstractScript } from "./support";

class SyncerDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const needed = await this.progressTracker.isDeployNeeded(
      "syncer",
      "address"
    );

    if (!needed) {
      return;
    }
    const syncer = await deploy<Syncer>("Syncer", this.log);
    await syncer.deployTransaction.wait(config.confirmations);
    for (const syncAddr of config.syncers) {
      await waitForTransaction(syncer.addSyncer(syncAddr));
      this.log.debug(`Added ${syncAddr} to syncer`);
    }
    await this.progressTracker.saveProgress(
      "syncer",
      "address",
      syncer.address
    );
    if (this.canVerify) {
      await run("verify:verify", {
        address: syncer.address,
      });
    }
  }
}

new SyncerDeployer().exec().catch(console.error);
