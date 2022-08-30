# Gearbox testnet playground

This project contains bunch of scripts to deploy gearbox playground, which is collection of peer contracts (tokens, DeFi protocols) that emulate mainnet environment and are automatically synced with mainnet by a robot.

## Developing

Playground can be deployed on testnet or on a local fork. Testnets (e.g. `kovan` and `goerli`) are configured in `hardhat.config.ts`. Environemt variables are required to make it work. Local fork is configured in `hardhat` network settings.

To deploy on fork run `npx hardhat node` to run hardhard local fork. Switch to another terminal window to run scripts against this network. Do not forget that your progress is not saved when you stop and restart the fork, so `.progress.<testnet>.local.json` should be deleted.

### Configuring

Set following environment variables your `.env` file (git-ignored).

| Name                 | Example                                    | Description                                                                                               |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| ETHERSCAN_API_KEY    | `<api key>`                                | Etherscan API key, required to verify contracts                                                           |
| ETH_GOERLI_PROVIDER  | `https://goerli.infura.io/v3/<api key>`    | Node url for goerli network                                                                               |
| GOERLI_PRIVATE_KEY   | `<private key>`                            | Deployer private key for goerli network                                                                   |
| ETH_KOVAN_PROVIDER   | `https://kovan.infura.io/v3/<api key>`     | Node url for kovan network                                                                                |
| KOVAN_PRIVATE_KEY    | `<private key>`                            | Deployer private key for kovan network                                                                    |
| ETH_MAINNET_PROVIDER | `https://mainnet.infura.io/v3/<api key>`   | Node url for main network                                                                                 |
| ETH_TESTNET_PROVIDER | `https://<testnet>.infura.io/v3/<api key>` | Node to fork local hardhat network from                                                                   |
| ETH_TESTNET_BLOCK    | 7373000                                    | Optionally set fork block number, this helps with getting same addresses every time you restart the fork. |
| TESTNET_PRIVATE_KEY  | `<private key>`                            | Deployer private key for local hardhat fork                                                               |
| TESNET_SYNCERS       | `<address>,<address>`                      | Comma-separated addresses that will be allowed to use Syncer                                              |

### Deploying

Prerequisites:

- Well-known address of WETH on target testnet should be set in `@gearbox-protocol/sdk`
- Addresses of [UNISWAP_V2_ROUTER](https://docs.uniswap.org/protocol/V2/reference/smart-contracts/router-02) and [SUSHISWAP_ROUTER](https://dev.sushi.com/docs/Developers/Deployment%20Addresses#testnets-goerli--kovan--rinkeby--ropsten) must be set for target testnet in `@gearbox-protocol/sdk`

Use `--network localhost` flag to connect to running hardhat fork. Use `--network goerli` to deploy on goerli. Use `--no-compile` to skip contract compilation on every script.

1. `npx hardhat run scripts/syncerDeploy.ts --network localhost --no-compile`  
   Deploys syncer. This is a contract that is accessed by robots that sync mainnet data with testnet.
2. `npx hardhat run scripts/tokensDeploy.ts --network localhost --no-compile`  
   Deploys mock of normal ERC20 tokens
3. `npx hardhat run scripts/mocksDeploy.ts --network localhost --no-compile`  
   Deploys DeFi protocol mocks: Lido, Curve, Convex, Yearn
4. `npx hardhat run scripts/curveAddLiquidity.ts --network localhost --no-compile`  
   Adds liquidity to Curve pools deployed on step 3. Can be run multiple times.
5. `npx hardhat run scripts/priceFeedDeploy.ts --network localhost --no-compile`  
   Deploys chainlink price feeds that will be synced with mainnets by robot
6. `npx hardhat run scripts/pairV2Deploy.ts --network localhost --no-compile`  
   Adds uniswap pairs for deployed tokens with deployed USDC, and adds liquidity to these pairs on well-known Uniswap and Sushiswap routers on target testnet.

It's also possible to run `npx hardhat run scripts/playgroundDeploy.ts --network localhost --no-compile` to deploy everything in one go

The deploy progress will be saved in json files (e.g. `.progress.goerli.json`). This file is required to pass data from one script to the next. For example, script to deploy yearn vaults will look for deployed DAI and USDC addresses to use as underlying tokens.

### Verification

During deployment, deployed contract addresses and their constructor params are saved in `.verifier.goerli.json` file or similar. To verify contracts run `npx hardhat run scripts/verify.ts --network goerli`. This script might fail, so it is possible that you'll need to run it multiple times. It will delete verified contracts from json file as it progresses.

After verification is done, it's possible to copy deployed contracts addresses from `progress.goerli.json` to `@gearbox-protocol/sdk` to fill missing addresses there.

### Further steps

In order to make syncer work, `CURVE_STETH_GATEWAY` is needed to be deployed. This can be done using `deployStethGateway` script from main contracts.
