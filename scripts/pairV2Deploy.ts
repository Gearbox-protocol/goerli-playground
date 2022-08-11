// @ts-ignore
import {
  ADDRESS_0X0,
  contractsByNetwork,
  IUniswapV2Router02__factory,
  MAX_INT,
  OracleType,
  priceFeedsByNetwork,
  SupportedToken,
  tokenDataByNetwork,
  WAD,
} from "@gearbox-protocol/sdk";
import { BigNumber } from "ethers";
import { Logger } from "tslog";
import config from "../config";
import {
  ChainlinkPriceFeed__factory,
  ERC20Kovan__factory,
  IUniswapV2Factory__factory,
  IUniswapV2Pair__factory,
} from "../types";
import { formatBN } from "../utils/formatter";
import setupScriptRuntime from "../utils/setupScriptRuntime";
import { waitForTransaction } from "../utils/transaction";

const log: Logger = new Logger();
const ethUsdPriceFeed = priceFeedsByNetwork.WETH.priceFeedUSD;

async function pairDeploy() {
  const { mainnetProvider, deployer } = await setupScriptRuntime();

  if (ethUsdPriceFeed?.type !== OracleType.CHAINLINK_ORACLE)
    throw new Error("Incorrect ETH/USD pricefeed");

  const ethUsdPf = ChainlinkPriceFeed__factory.connect(
    ethUsdPriceFeed.address.Mainnet,
    mainnetProvider
  );
  const ethUsdPrice = (await ethUsdPf.latestRoundData()).answer;

  console.log("ETH/USD", ethUsdPrice.toString());

  // USDC TOKEN
  const usdcAddr = tokenDataByNetwork[config.network].USDC;
  const usdcToken = ERC20Kovan__factory.connect(usdcAddr, deployer);
  const usdcDecimals = await usdcToken.decimals();

  const usdcDecimalMult = BigNumber.from(10).pow(usdcDecimals);
  const usdcAmount = usdcDecimalMult.mul(100e6);

  for (const routerAddr of [
    contractsByNetwork[config.network].UNISWAP_V2_ROUTER,
    contractsByNetwork[config.network].SUSHISWAP_ROUTER,
  ]) {
    const uniV2Router = IUniswapV2Router02__factory.connect(
      routerAddr,
      deployer
    );

    await waitForTransaction(
      ERC20Kovan__factory.connect(usdcAddr, deployer).approve(
        routerAddr,
        MAX_INT
      )
    );

    const uniV2factory = IUniswapV2Factory__factory.connect(
      await uniV2Router.factory(),
      deployer
    );

    for (const [sym, token] of Object.entries(
      tokenDataByNetwork[config.network]
    )) {
      const pf = priceFeedsByNetwork[sym as SupportedToken];

      if (sym === "WETH" || sym === "USDC") continue;

      if (
        pf.priceFeedUSD?.type !== OracleType.CHAINLINK_ORACLE &&
        pf.priceFeedETH?.type !== OracleType.CHAINLINK_ORACLE
      ) {
        continue;
      }

      let usdPrice = BigNumber.from(0);

      if (pf.priceFeedUSD?.type === OracleType.CHAINLINK_ORACLE) {
        const pfeed = ChainlinkPriceFeed__factory.connect(
          pf.priceFeedUSD.address.Mainnet,
          mainnetProvider
        );
        const data = await pfeed.latestRoundData();
        usdPrice = data.answer;
      } else if (pf.priceFeedETH?.type === OracleType.CHAINLINK_ORACLE) {
        const pfeed = ChainlinkPriceFeed__factory.connect(
          pf.priceFeedETH.address.Mainnet,
          mainnetProvider
        );
        const data = await pfeed.latestRoundData();

        usdPrice = data.answer.mul(ethUsdPrice).div(WAD);
      } else throw Error("Incorrect pricefeed data");

      log.debug(`${sym}: ${usdPrice.div(1e4).toNumber() / 10000}`);

      let pairAddr = await uniV2factory.getPair(token, usdcAddr);
      if (pairAddr === ADDRESS_0X0) {
        await waitForTransaction(uniV2factory.createPair(token, usdcAddr));
        pairAddr = await uniV2factory.getPair(token, usdcAddr);
      }

      const tokenContract = ERC20Kovan__factory.connect(token, deployer);

      const tokenDecimals = await tokenContract.decimals();

      const tokenAmount = usdcAmount
        .mul(1e8)
        .div(usdPrice)
        .mul(BigNumber.from(10).pow(tokenDecimals))
        .div(usdcDecimalMult);

      log.debug("Pair address: ", pairAddr);
      log.debug(`USDC to pool: ${formatBN(usdcAmount, usdcDecimals)}`);
      log.debug(`${sym} to pool: ${formatBN(tokenAmount, tokenDecimals)}`);

      const lpTokenBalance = await IUniswapV2Pair__factory.connect(
        pairAddr,
        deployer
      ).balanceOf(deployer.address);
      log.debug(`Deployer balance: ${lpTokenBalance}`);

      if (lpTokenBalance.isZero()) {
        await waitForTransaction(tokenContract.approve(routerAddr, MAX_INT));

        await waitForTransaction(
          tokenContract.mint(deployer.address, tokenAmount)
        );
        await waitForTransaction(usdcToken.mint(deployer.address, usdcAmount));

        await waitForTransaction(
          uniV2Router.addLiquidity(
            token,
            usdcAddr,
            tokenAmount,
            usdcAmount,
            tokenAmount,
            usdcAmount,
            deployer.address,
            Math.floor(Date.now() / 1000 + 24 * 3600)
          )
        );

        const lpTokenBalance = await IUniswapV2Pair__factory.connect(
          pairAddr,
          deployer
        ).balanceOf(deployer.address);

        log.debug(`Deployer balance: ${lpTokenBalance}`);
      }
    }
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
