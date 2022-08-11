import { NetworkType } from "@gearbox-protocol/sdk";

export interface TestnetConfig {
  url: string;
  network: NetworkType;
  // Allowed syncer addresses (besides sender)
  syncers: string[];
  // Path of json file with mocks deploy progress
  progressFileName: string;
  // Optionally wait for N confirmations before considering that contract is deployed
  confirmations?: number;
  // Price feeds for following token symbols won't be deployed
  // used during local fork development, when main gearbox contracts haven't been deployed yet
  skipPriceFeedsFor?: string[];
}

const KOVAN: TestnetConfig = {
  url: process.env.ETH_KOVAN_PROVIDER!,
  network: "Kovan",
  syncers: ["0xd037ca7a2b62c66b0f01cb2c93b978493dcd06d6"],
  confirmations: 10,
  progressFileName: "./mock_addresses_kovan.json",
};

const GOERLY_LOCAL: TestnetConfig = {
  url: "http://localhost:8545",
  network: "Goerli",
  syncers: ["0xd037ca7a2b62c66b0f01cb2c93b978493dcd06d6"],
  progressFileName: "./mock_addresses_goerli_local.json",
  skipPriceFeedsFor: ["dDAI", "dUSDC", "dWBTC", "dWETH", "GEAR"],
};

// export one of testnet configs as default
export default GOERLY_LOCAL;
