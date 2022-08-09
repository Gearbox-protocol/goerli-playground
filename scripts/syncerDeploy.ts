import * as dotenv from "dotenv";
import { Logger } from "tslog";
import config from "../config";
import { Syncer } from "../types";
import setupScriptRuntime from "../utils/setupScriptRuntime";
import { deploy, waitForTransaction } from "../utils/transaction";

import { LOCAL_NETWORK } from "@gearbox-protocol/sdk";
import { run } from "hardhat";

async function deploySyncer() {
  dotenv.config({ path: ".env.local" });
  const log: Logger = new Logger();

  const runtime = await setupScriptRuntime();

  const syncer = await deploy<Syncer>("Syncer", log);
  await syncer.deployTransaction.wait(config.confirmations);

  await waitForTransaction(syncer.addSyncer(config.syncerRobot));

  if (runtime.chainId !== LOCAL_NETWORK) {
    await run("verify:verify", {
      address: syncer.address,
    });
  }
}

deploySyncer()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
