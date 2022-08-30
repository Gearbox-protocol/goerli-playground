import { waitForTransaction } from "@gearbox-protocol/devops";
import { providers } from "ethers";

import { IStETHMock__factory } from "../types";
import { AbstractScript } from "./src/AbstractScript";

export class WithdrawETH extends AbstractScript {
  protected async run(): Promise<void> {
    const ethProvider = new providers.EtherscanProvider(
      42,
      process.env.ETHERSCAN_API_KEY,
    );

    this.log.info("getting history", await this.deployer.getAddress());

    const txs = await ethProvider.getHistory(this.deployer.address, 32058875);

    const deployTx = txs
      .filter(txs => txs.to === null)
      .sort((a, b) => ((a.blockNumber || 0) > (b.blockNumber || 0) ? 1 : -1));

    for (let tx of deployTx) {
      const { hash } = tx;
      const receipt = await ethProvider.getTransactionReceipt(hash);
      const contract = receipt.contractAddress;
      this.log.debug("found contract:", receipt.contractAddress, hash);
      const balance = await this.deployer.provider?.getBalance(contract);

      if (balance?.gt(1)) {
        try {
          await waitForTransaction(
            IStETHMock__factory.connect(contract, this.deployer).retrieve_eth(),
          );
          this.log.info("Withdraw", balance.toString());
        } catch {
          this.log.error("Cant withdraw", balance.toString());
        }
      }
    }
  }
}

new WithdrawETH().exec().catch(console.error);
