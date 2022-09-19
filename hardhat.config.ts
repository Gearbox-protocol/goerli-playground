import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-vyper";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";

import { LOCAL_NETWORK, MAINNET_NETWORK } from "@gearbox-protocol/sdk";
import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/types";

// gets data from .env file
dotEnvConfig();

const WPK =
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key

const BOXCODE_PRIVATE_KEY = process.env.BOXCODE_PRIVATE_KEY ?? WPK;
const BVI_PRIVATE_KEY = process.env.BVI_PRIVATE_KEY ?? WPK;
const KOVAN_PRIVATE_KEY = process.env.KOVAN_PRIVATE_KEY ?? WPK;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY ?? WPK;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
        },
      },
    ],
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
      chainId: LOCAL_NETWORK,
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      timeout: 0,
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

    kovan: {
      url: `${process.env.ETH_KOVAN_PROVIDER}`,
      accounts: [KOVAN_PRIVATE_KEY],
      gasPrice: 2e9,
      gasMultiplier: 1.5,
      minGasPrice: 1e9,
      timeout: 0,
      allowUnlimitedContractSize: false,
    },

    goerli: {
      url: `${process.env.ETH_GOERLI_PROVIDER}`,
      accounts: [GOERLI_PRIVATE_KEY],
      gasPrice: 2e9,
      gasMultiplier: 1.5,
      minGasPrice: 1e9,
      timeout: 0,
      allowUnlimitedContractSize: false,
    },
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

if (ETHERSCAN_API_KEY) {
  config.etherscan = {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  };
}

export default config;
