import { TradingBot } from "../../types";
import { AbstractScript } from "./AbstractScript";

export class TradingBotDeployer extends AbstractScript {
  protected async run(): Promise<void> {
    const needed = await this.progress.isDeployNeeded("tradingBot", "address");

    if (!needed) {
      return;
    }
    const bot = await this.deploy<TradingBot>("TradingBot", this.syncer);
    await this.progress.save("tradingBot", "address", bot.address);
  }
}
