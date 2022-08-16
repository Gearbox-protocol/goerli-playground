import { waitForTransaction } from "@gearbox-protocol/devops";

import { Syncer } from "../../types";
import { AbstractScript } from "./AbstractScript";

export class SyncerDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const needed = await this.progress.isDeployNeeded("syncer", "address");

    if (!needed) {
      return;
    }
    const syncer = await this.deploy<Syncer>("Syncer");
    const syncers = process.env.TESNET_SYNCERS?.split(",").map(s => s.trim());
    if (!syncers || !syncers?.[0]) {
      throw new Error("syncers are not provided");
    }

    for (const syncAddr of syncers) {
      await waitForTransaction(syncer.addSyncer(syncAddr));
      this.log.debug(`Added ${syncAddr} to syncer`);
    }
    await this.progress.save("syncer", "address", syncer.address);
  }
}
