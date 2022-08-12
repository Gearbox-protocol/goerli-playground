# Gearbox testnet playground

TODO: short project description

## Developing

### Configuring

### Developing on local fork

Configure your `.env` file with testnet provider url. Optionally set fork block number, this helps with getting same addresses every time you restart the fork.
Run `npx hardhat node` to run hardhard local fork. Switch to another terminal window to run scripts against this network.

### Deploy order

Use `--network localhost` flag to connect to running fork

1. `npx hardhat run scripts/syncerDeploy.ts --network localhost`  
   Deploys syncer. This is a contract that is accessed by robots that sync mainnet data with testnet.
2. `npx hardhat run scripts/tokensDeploy.ts --network localhost`  
   Deploys mock of normal ERC20 tokens
3. `npx hardhat run scripts/mocksDeploy.ts --network localhost`  
   Deploys DeFi protocol mocks: Lido, Curve, Convex, Yearn
4. `npx hardhat run scripts/curveAddLiquidity2.ts --network localhost`  
   Adds liquidity to Curve pools deployed on step 3. Can be run multiple times.
5.
