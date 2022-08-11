import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-vyper";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";

import { MAINNET_NETWORK } from "@gearbox-protocol/sdk";
import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/types";

// gets data from .env file
dotEnvConfig();

const TESTNET_PRIVATE_KEY =
  process.env.TESTNET_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key

const TESTNET2_PRIVATE_KEY =
  process.env.TESTNET2_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key

const BOXCODE_PRIVATE_KEY =
  process.env.BOSXCODE_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key

const BVI_PRIVATE_KEY =
  process.env.BVI_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.8.10", settings: {} }],
  },
  vyper: {
    compilers: [
      { version: "0.3.0" },
      { version: "0.2.4" },
      { version: "0.2.8" },
      { version: "0.2.5" },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_TESTNET_PROVIDER!,
        // pin block number to have stable addresses every time during local development
        blockNumber: process.env.ETH_TESTNET_BLOCK
          ? parseInt(process.env.ETH_TESTNET_BLOCK, 10)
          : undefined,
      },
      loggingEnabled: true,
    },
    localhost: {
      timeout: 0,
      accounts: [TESTNET_PRIVATE_KEY, TESTNET2_PRIVATE_KEY],
    },
    mainnet: {
      url: process.env.ETH_MAINNET_PROVIDER || "",
      accounts: [BOXCODE_PRIVATE_KEY, BVI_PRIVATE_KEY],
      chainId: MAINNET_NETWORK,
      timeout: 0,
      gasMultiplier: 1.15,
      minGasPrice: 1e9,
      allowUnlimitedContractSize: false,
    },

    testnet: {
      url: `${process.env.ETH_TESTNET_PROVIDER}`,
      accounts: [TESTNET_PRIVATE_KEY, TESTNET2_PRIVATE_KEY],
      gasPrice: 2e9,
      gasMultiplier: 1.5,
      minGasPrice: 1e9,
      timeout: 0,
      allowUnlimitedContractSize: false,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    gasPrice: 21,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
  },
};

export default config;
