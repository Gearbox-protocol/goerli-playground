import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  normalTokens,
  SupportedToken,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { ethers } from "hardhat";

import { ERC20Testnet, ERC20Testnet__factory } from "../types";

const THIEF = "0xd19b598712413E69b48f70c5Ea16286cf8DFD632";

async function burnMf(token: ERC20Testnet) {
  const balance = await token.balanceOf(THIEF);
  await waitForTransaction(token.burn(THIEF, balance));
}

async function burnTokens() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const tokens = Object.keys(normalTokens).map(
    t => tokenDataByNetwork.Goerli[t as SupportedToken],
  );

  for (let t of tokens) {
    const token = ERC20Testnet__factory.connect(t, deployer);
    await burnMf(token);
    token.on(token.filters.Transfer(null, THIEF), async () => {
      await burnMf(token);
    });
  }
}

burnTokens()
  .then(() => console.log("Ok"))
  .catch(e => console.log(e));
