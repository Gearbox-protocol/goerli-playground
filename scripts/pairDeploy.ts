// @ts-ignore
import { ethers } from "hardhat";
import { providers } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { formatBN } from "../utils/formatter";
import { BigNumber } from "ethers";
import {
  IUniswapV2Router02__factory,
  KOVAN_NETWORK,
  OracleType,
  priceFeedsByNetwork,
  SupportedTokens,
  SUSHISWAP_KOVAN,
  tokenDataByNetwork,
  UNISWAP_V2_ROUTER,
  WAD,
} from "@gearbox-protocol/sdk";
import { ChainlinkPriceFeed__factory, ERC20Kovan__factory } from "../types";
import { Logger } from "tslog";
import { waitForTransaction } from "../utils/transaction";

const log: Logger = new Logger();
const ethUsdPriceFeedAddr = priceFeedsByNetwork.WETH.priceFeedUSD;

async function pairDeploy() {
  const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();

  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) throw new Error("ETH_MAINNET_PROVIDER is not defined");

  if (chainId !== 42) throw new Error("Switch to Kovan network");

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);

  if (ethUsdPriceFeedAddr?.type !== OracleType.CHAINLINK_ORACLE)
    throw new Error("Incorrect ETH/USD pricefeed");

  const ethUsdPf = ChainlinkPriceFeed__factory.connect(
    ethUsdPriceFeedAddr.address,
    mainnetProvider
  );
  const ethUsdPrice = (await ethUsdPf.latestRoundData()).answer;

  console.log("ETH/USD", ethUsdPrice.toString());

  const usdcToken = ERC20Kovan__factory.connect(
    tokenDataByNetwork.Kovan.USDC,
    deployer
  );

  const uniV2Router = IUniswapV2Router02__factory.connect(
    UNISWAP_V2_ROUTER,
    deployer
  );
  const sushiRouter = IUniswapV2Router02__factory.connect(
    SUSHISWAP_KOVAN,
    deployer
  );

  for (const [sym, token] of Object.entries(tokenDataByNetwork.Kovan)) {
    const pf = priceFeedsByNetwork[sym as SupportedTokens];

    if (sym === "WETH") continue;

    if (
      pf.priceFeedUSD?.type !== OracleType.CHAINLINK_ORACLE &&
      pf.priceFeedETH?.type !== OracleType.CHAINLINK_ORACLE
    ) {
      continue;
    }

    let usdPrice = BigNumber.from(0);

    if (pf.priceFeedUSD?.type === OracleType.CHAINLINK_ORACLE) {
      const pfeed = ChainlinkPriceFeed__factory.connect(
        pf.priceFeedUSD.address,
        mainnetProvider
      );
      const data = await pfeed.latestRoundData();
      usdPrice = data.answer;
    } else if (pf.priceFeedETH?.type === OracleType.CHAINLINK_ORACLE) {
      const pfeed = ChainlinkPriceFeed__factory.connect(
        pf.priceFeedETH.address,
        mainnetProvider
      );
      const data = await pfeed.latestRoundData();

      usdPrice = data.answer.mul(ethUsdPrice).div(WAD);
    } else throw Error("Incorrect pricefeed data");

    log.debug(`${sym}: ${usdPrice.div(1e4).toNumber()/10000}`);

    // const contractArtifact = (await ethers.getContractFactory(
    //   "DieselToken"
    // )) as DieselToken__factory;

    // const contract = await contractArtifact.attach(
    //   tokenDataByNetwork.Kovan[token.symbol].address
    // );
    // await contract.deployed();

    // // await contract.approve(SUSHISWAP_ADDRESS, MAX_INT)

    // // дальше иду на роутер - дергаю функцию addLiquidityETH (100ETH + price * 100 токенов)

    // const priceFeed = await testDeployer.getChainlinkPriceFeed(
    //   token.priceFeed,
    //   deployer
    // );

    // const priceFeedDecimals = await priceFeed.decimals();
    // const result: ChainlinkOracleResult = await priceFeed.latestRoundData();

    // console.log(
    //   `${token.symbol}: ${formatBN(result.answer, priceFeedDecimals)}`
    // );

    // const amount = WAD.mul(BigNumber.from(10).pow(priceFeedDecimals)).div(
    //   result.answer
    // );
    // console.log(formatBN(amount, 18));

    // await sushiRouter.addLiquidityETH(
    //   tokenDataByNetwork.Kovan[token.symbol].address,
    //   amount,
    //   amount,
    //   WAD,
    //   deployer.address
    // );

    await waitForTransaction(sushiRouter.addLiquidity())
  }
}

pairDeploy()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
