import { waitForTransaction } from "@gearbox-protocol/devops";
import {
  ADDRESS_0X0,
  contractsByNetwork,
  formatBN,
  IUniswapV2Router02__factory,
  MAX_INT,
  OracleType,
  priceFeedsByNetwork,
  SupportedToken,
  WAD,
} from "@gearbox-protocol/sdk";
import { BigNumber } from "ethers";

import {
  ChainlinkPriceFeed__factory,
  CVXTestnet__factory,
  ERC20Testnet__factory,
  IUniswapV2Factory__factory,
  IUniswapV2Pair__factory,
} from "../../types";
import { AbstractScript } from "./AbstractScript";

const ethUsdPriceFeed = priceFeedsByNetwork.WETH.priceFeedUSD;

/**
 * This script creates USDC (our testnet USDC) pairs for each of our testnet tokens on uniswap and sushiswap  on testnet,
 * and also provides liquidity to these pairs
 */
export class PairV2Deployer extends AbstractScript {
  protected async run(): Promise<void> {
    if (ethUsdPriceFeed?.type !== OracleType.CHAINLINK_ORACLE) {
      throw new Error("Incorrect ETH/USD pricefeed");
    }

    const ethUsdPf = ChainlinkPriceFeed__factory.connect(
      ethUsdPriceFeed.address.Mainnet,
      this.mainnetProvider,
    );
    const ethUsdPrice = (await ethUsdPf.latestRoundData()).answer;

    console.log("ETH/USD", ethUsdPrice.toString());

    // USDC TOKEN
    const usdcAddr = await this.progress.getOrThrow("normalTokens", "USDC");
    const usdcToken = ERC20Testnet__factory.connect(usdcAddr, this.deployer);
    const usdcDecimals = await usdcToken.decimals();

    const usdcDecimalMult = BigNumber.from(10).pow(usdcDecimals);
    const usdcAmount = usdcDecimalMult.mul(100e6);

    for (const routerAddr of [
      contractsByNetwork[this.network].UNISWAP_V2_ROUTER,
      contractsByNetwork[this.network].SUSHISWAP_ROUTER,
    ]) {
      const uniV2Router = IUniswapV2Router02__factory.connect(
        routerAddr,
        this.deployer,
      );

      await waitForTransaction(
        ERC20Testnet__factory.connect(usdcAddr, this.deployer).approve(
          routerAddr,
          MAX_INT,
        ),
      );

      const uniV2factory = IUniswapV2Factory__factory.connect(
        await uniV2Router.factory(),
        this.deployer,
      );

      for (const [s, pf] of Object.entries(priceFeedsByNetwork)) {
        const sym = s as SupportedToken;

        if (sym === "WETH" || sym === "USDC") {
          continue;
        }

        if (
          pf.priceFeedUSD?.type !== OracleType.CHAINLINK_ORACLE &&
          pf.priceFeedETH?.type !== OracleType.CHAINLINK_ORACLE
        ) {
          continue;
        }

        let usdPrice = BigNumber.from(0);

        if (pf.priceFeedUSD?.type === OracleType.CHAINLINK_ORACLE) {
          if (!pf.priceFeedUSD.address.Mainnet) {
            this.log.warn(`Prices feed ${sym}/USD is not found on mainnet`);
            continue;
          }
          const pfeed = ChainlinkPriceFeed__factory.connect(
            pf.priceFeedUSD.address.Mainnet,
            this.mainnetProvider,
          );
          const data = await pfeed.latestRoundData();
          usdPrice = data.answer;
        } else if (pf.priceFeedETH?.type === OracleType.CHAINLINK_ORACLE) {
          if (!pf.priceFeedETH.address.Mainnet) {
            this.log.warn(`Prices feed ${sym}/ETH is not found on mainnet`);
            continue;
          }
          const pfeed = ChainlinkPriceFeed__factory.connect(
            pf.priceFeedETH.address.Mainnet,
            this.mainnetProvider,
          );
          const data = await pfeed.latestRoundData();

          usdPrice = data.answer.mul(ethUsdPrice).div(WAD);
        } else {
          throw Error(`Incorrect price feed data for ${sym}`);
        }

        this.log.debug(`${sym}: ${usdPrice.div(1e4).toNumber() / 10000}`);
        const token = await this.getSupportedTokenAddress(sym);
        if (!token) {
          this.log.warn(`Cannot find testnet address for token ${sym}`);
          continue;
        }

        let pairAddr = await uniV2factory.getPair(token, usdcAddr);
        if (pairAddr === ADDRESS_0X0) {
          await waitForTransaction(uniV2factory.createPair(token, usdcAddr));
          pairAddr = await uniV2factory.getPair(token, usdcAddr);
        }

        const tokenContract = ERC20Testnet__factory.connect(
          token,
          this.deployer,
        );

        const tokenDecimals = await tokenContract.decimals();

        const tokenAmount = usdcAmount
          .mul(1e8)
          .div(usdPrice)
          .mul(BigNumber.from(10).pow(tokenDecimals))
          .div(usdcDecimalMult);

        this.log.debug("Pair address: ", pairAddr);
        this.log.debug(`USDC to pool: ${formatBN(usdcAmount, usdcDecimals)}`);
        this.log.debug(
          `${sym} to pool: ${formatBN(tokenAmount, tokenDecimals)}`,
        );

        const lpTokenBalance = await IUniswapV2Pair__factory.connect(
          pairAddr,
          this.deployer,
        ).balanceOf(this.deployer.address);
        this.log.debug(`Deployer balance: ${lpTokenBalance}`);

        if (lpTokenBalance.isZero()) {
          await waitForTransaction(tokenContract.approve(routerAddr, MAX_INT));

          await this.mintTokenToDeployer(sym, token, tokenAmount);
          await waitForTransaction(
            usdcToken.mint(this.deployer.address, usdcAmount),
          );

          await waitForTransaction(
            uniV2Router.addLiquidity(
              token,
              usdcAddr,
              tokenAmount,
              usdcAmount,
              tokenAmount,
              usdcAmount,
              this.deployer.address,
              Math.floor(Date.now() / 1000 + 24 * 3600),
            ),
          );

          const lpTokenBalance = await IUniswapV2Pair__factory.connect(
            pairAddr,
            this.deployer,
          ).balanceOf(this.deployer.address);

          this.log.debug(`Deployer balance: ${lpTokenBalance}`);
        }
      }
    }
  }

  private async mintTokenToDeployer(
    symbol: SupportedToken,
    address: string,
    amount: BigNumber,
  ): Promise<void> {
    if (symbol === "CVX") {
      // CVX is a special case, have to call mintExact instead and call it from syncer (deployer is syncer)
      const cvxContract = CVXTestnet__factory.connect(address, this.deployer);
      await waitForTransaction(cvxContract.mintExact(amount));
    } else {
      const tokenContract = ERC20Testnet__factory.connect(
        address,
        this.deployer,
      );
      await waitForTransaction(
        tokenContract.mint(this.deployer.address, amount),
      );
    }
  }
}
