import { NormalToken, normalTokens } from "@gearbox-protocol/sdk";
import { BigNumber, BigNumberish } from "ethers";
import inquirer from "inquirer";

import { ERC20Testnet__factory } from "../types";
import { AbstractScript } from "./src/AbstractScript";

interface Answers {
  address: string;
  amount: BigNumberish;
  tokens: NormalToken[];
}

export class SendTokens extends AbstractScript {
  protected async run(): Promise<void> {
    const opts = await inquirer.prompt<Answers>([
      {
        type: "input",
        name: "address",
        message: "Address to mint tokens to",
        validate: value => {
          if (value.match(/^0x[a-fA-F0-9]{40}$/)) {
            return true;
          }
          return "Please enter a valid address";
        },
      },
      {
        type: "input",
        name: "amount",
        default: "100000000", // 10**8
        message: "Amount of tokens to mint (without decimals)",
        validate: value => {
          try {
            BigNumber.from(value);
            return true;
          } catch {}
          return "Please enter a valid amount";
        },
      },
      {
        type: "checkbox",
        message: "Select tokens",
        name: "tokens",
        choices: Object.keys(normalTokens)
          .filter(n => n !== "WETH")
          .map(name => ({ name })),
        validate: answer => {
          if (answer.length < 1) {
            return "You must choose at least one token";
          }
          return true;
        },
      },
    ]);

    for (const t of opts.tokens) {
      const tokenAddr = await this.getSupportedTokenAddress(t);
      if (!tokenAddr) {
        this.log.warn(`Token %${t} is not deployed`);
        continue;
      }

      const token = ERC20Testnet__factory.connect(tokenAddr, this.deployer);
      const decimals = await token.decimals();

      this.log.info(`Sending ${t} to ${opts.address}`);

      await this.mintToken(
        t,
        opts.address,
        BigNumber.from(10).pow(decimals).mul(opts.amount),
      );
    }
  }
}

new SendTokens().exec().catch(console.error);
