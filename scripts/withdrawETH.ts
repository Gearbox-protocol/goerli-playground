import { waitForTransaction } from "@gearbox-protocol/devops";
import * as dotenv from "dotenv";
import { providers, Signer } from "ethers";
import { ethers } from "hardhat";
import { Logger } from "tslog";

import { IStETHMock__factory } from "../types";

async function withdrawETH(): Promise<void> {
  dotenv.config({ path: ".env" });
  dotenv.config({ path: ".env.kovan" });
  const log: Logger = new Logger();

  const accounts = (await ethers.getSigners()) as Array<Signer>;
  const deployer = accounts[0];

  const ethProvider = new providers.EtherscanProvider(
    42,
    process.env.ETHERSCAN_API_KEY
  );

  console.log("getting history", await deployer.getAddress());

  const txs = await ethProvider.getHistory(
    await deployer.getAddress(),
    32058875
  );

  const deployTx = txs
    .filter((txs) => txs.to === null)
    .sort((a, b) => ((a.blockNumber || 0) > (b.blockNumber || 0) ? 1 : -1));

  for (let tx of deployTx) {
    const { hash } = tx;
    console.log(hash);

    const receipt = await ethProvider.getTransactionReceipt(hash);

    const contract = receipt.contractAddress;
    console.log("found contract:", receipt.contractAddress);
    const balance = await deployer.provider?.getBalance(contract);

    if (balance?.gt(1)) {
      try {
        await waitForTransaction(
          IStETHMock__factory.connect(contract, deployer).retrieve_eth()
        );

        console.log("Withdraw", balance.toString());
      } catch {
        console.error("Cant withdraw", balance.toString());
      }
    }
  }

  console.log();
}

withdrawETH()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
