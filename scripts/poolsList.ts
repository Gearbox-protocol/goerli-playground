import {
  IAddressProvider__factory,
  IDataCompressor__factory,
  IERC20Metadata__factory,
} from "@gearbox-protocol/sdk";

import { AbstractScript } from "./src";

export class ListPools extends AbstractScript {
  protected async run(): Promise<void> {
    const addressProvider = IAddressProvider__factory.connect(
      process.env.REACT_APP_ADDRESS_PROVIDER || "",
      this.deployer,
    );

    const dc = IDataCompressor__factory.connect(
      await addressProvider.getDataCompressor(),
      this.deployer,
    );

    const pools = await dc.getPoolsList();

    for (const p of pools) {
      const { addr, underlying, dieselToken } = p;
      const token = IERC20Metadata__factory.connect(underlying, this.deployer);
      const sym = await token.symbol();
      console.log(`${sym}: `);
      console.log(`addr: ${addr} `);
      console.log(`diesel: ${dieselToken} `);
    }
  }
}

new ListPools().exec().catch(console.error);
