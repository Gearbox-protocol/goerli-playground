# Gearbox testnet playground

TODO: short project description

## Developing

### Configuring

### Developing on local fork

Configure your `.env` file with testnet provider url. Optionally set fork block number, this helps with getting same addresses every time you restart the fork.
Run `npx hardhat node` to run hardhard local fork. Switch to another terminal window to run scripts against this network.

### Deploy order

Prerequisites:

- Well-known address of WETH on target testnet should be set in `@gearbox-protocol/sdk`
- Addresses of [UNISWAP_V2_ROUTER](https://docs.uniswap.org/protocol/V2/reference/smart-contracts/router-02) and [SUSHISWAP_ROUTER](https://dev.sushi.com/docs/Developers/Deployment%20Addresses#testnets-goerli--kovan--rinkeby--ropsten) must be set for target testnet in `@gearbox-protocol/sdk`

Use `--network localhost` flag to connect to running hardhat fork. Use `--no-compile` to skip contract compilation on every script.

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
