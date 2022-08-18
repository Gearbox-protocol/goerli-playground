import { TradingBot } from "../../types";
import { AbstractDeployer } from "./AbstractDeployer";

export class TradingBotDeployer extends AbstractDeployer {
  protected async run(): Promise<void> {
    const needed = await this.progress.isDeployNeeded("tradingBot", "address");

    if (!needed) {
      return;
    }
    const bot = await this.deploy<TradingBot>("TradingBot", this.syncer);
    await this.progress.save("tradingBot", "address", bot.address);
  }
}
