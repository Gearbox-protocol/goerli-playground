import { AbstractScript } from "./AbstractScript";

export abstract class AbstractDeployer extends AbstractScript {
  // syncer address
  protected syncer!: string;

  protected override async setup(): Promise<void> {
    await super.setup();
    this.syncer = await this.progress.getOrThrow("syncer", "address");
    this.log.debug(`Syncer: ${this.syncer}`);
  }
}
