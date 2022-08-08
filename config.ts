import {
  KOVAN_NETWORK,
  LOCAL_NETWORK,
  NetworkType,
} from "@gearbox-protocol/sdk";

export interface TestnetConfig {
  url: string;
  network: NetworkType;
  chainId: number;
}

const KOVAN: TestnetConfig = {
  url: process.env.ETH_KOVAN_PROVIDER!,
  network: "Kovan",
  chainId: KOVAN_NETWORK,
};

const GOERLY_LOCAL: TestnetConfig = {
  url: "http://localhost:8545",
  network: "Goerli",
  chainId: LOCAL_NETWORK,
};

// export one of testnet configs as default
export default GOERLY_LOCAL;
