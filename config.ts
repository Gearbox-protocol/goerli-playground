import {
  KOVAN_NETWORK,
  LOCAL_NETWORK,
  NetworkType,
} from "@gearbox-protocol/sdk";

export interface TestnetConfig {
  url: string;
  network: NetworkType;
  chainId: number;
  // Address of syncer contract
  syncer: string;
  // Address of ???
  syncerRobot: string;
  // Path of json file with mocks deploy progress
  progressFileName: string;
  // Optionally wait for N confirmations before considering that contract is deployed
  confirmations?: number;
}

const KOVAN: TestnetConfig = {
  url: process.env.ETH_KOVAN_PROVIDER!,
  network: "Kovan",
  chainId: KOVAN_NETWORK,
  syncer: "0xC6493381d29e813D56063A1AffBbbC534fdCd70b",
  syncerRobot: "0xd037ca7a2b62c66b0f01cb2c93b978493dcd06d6",
  confirmations: 10,
  progressFileName: "./mock_addresses_kovan.json",
};

const GOERLY_LOCAL: TestnetConfig = {
  url: "http://localhost:8545",
  network: "Goerli",
  chainId: LOCAL_NETWORK,
  syncer: "0x8E02433C31B51ABe3Ac65908d59eF82ddB52714F",
  syncerRobot: "0xd037ca7a2b62c66b0f01cb2c93b978493dcd06d6",
  progressFileName: "./mock_addresses_goerli_local.json",
};

// export one of testnet configs as default
export default GOERLY_LOCAL;
