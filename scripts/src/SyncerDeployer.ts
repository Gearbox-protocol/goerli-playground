import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { run } from "hardhat";

import config from "../../config";
import { Syncer } from "../../types";
import { AbstractScript } from "./AbstractScript";

export class SyncerDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const needed = await this.progress.isDeployNeeded("syncer", "address");

    if (!needed) {
      return;
    }
    const syncer = await deploy<Syncer>("Syncer", this.log);
    await syncer.deployTransaction.wait(config.confirmations);
    for (const syncAddr of config.syncers) {
      await waitForTransaction(syncer.addSyncer(syncAddr));
      this.log.debug(`Added ${syncAddr} to syncer`);
    }
    await this.progress.save("syncer", "address", syncer.address);
    if (this.canVerify) {
      await run("verify:verify", {
        address: syncer.address,
      });
    }
  }
}
