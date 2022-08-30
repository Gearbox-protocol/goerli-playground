import { waitForTransaction } from "@gearbox-protocol/devops";

import { Syncer, Syncer__factory } from "../../types";
import { AbstractScript } from "./AbstractScript";

export class SyncerDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const syncerAddr = await this.progress.get("syncer", "address");

    let syncer: Syncer;
    if (syncerAddr) {
      syncer = Syncer__factory.connect(syncerAddr, this.deployer);
    } else {
      syncer = await this.deploy<Syncer>("Syncer");
      await this.progress.save("syncer", "address", syncer.address);
    }

    const syncers = process.env.TESNET_SYNCERS?.split(",").map(s => s.trim());
    if (!syncers || !syncers?.[0]) {
      throw new Error("syncers are not provided");
    }

    for (const syncAddr of syncers) {
      await waitForTransaction(syncer.addSyncer(syncAddr));
      this.log.debug(`Added ${syncAddr} to syncer`);
    }
  }
}
