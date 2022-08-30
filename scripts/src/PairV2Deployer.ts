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
  ERC20Testnet,
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
  private usdcDecimalMult!: BigNumber;

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

    this.usdcDecimalMult = BigNumber.from(10).pow(usdcDecimals);

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

        if (sym === "USDC") {
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

        this.log.debug(
          `${sym} price: ${usdPrice.div(1e4).toNumber() / 10000} USD`,
        );
        const token = await this.getSupportedTokenAddress(sym);
        if (!token) {
          this.log.warn(`Cannot find testnet address for token ${sym}`);
          continue;
        }

        let pairAddr = await uniV2factory.getPair(token, usdcAddr);
        if (pairAddr === ADDRESS_0X0) {
          await waitForTransaction(uniV2factory.createPair(token, usdcAddr));
          pairAddr = await uniV2factory.getPair(token, usdcAddr);
          this.log.info(`Created ${sym}/USDC pair`);
        }

        const tokenContract = ERC20Testnet__factory.connect(
          token,
          this.deployer,
        );
        this.log.debug(`${sym}/USDC pair address: ${pairAddr}`);
        const [tokenAmount, usdcAmount] = await this.determineTokensAmount(
          sym,
          tokenContract,
          usdPrice,
        );
        this.log.debug(`USDC to pool: ${formatBN(usdcAmount, usdcDecimals)}`);

        const lpTokenBalance = await IUniswapV2Pair__factory.connect(
          pairAddr,
          this.deployer,
        ).balanceOf(this.deployer.address);
        this.log.debug(`Deployer balance: ${lpTokenBalance}`);

        if (lpTokenBalance.isZero()) {
          await this.approve(sym, routerAddr);
          await this.mintToken(sym, this.deployer.address, tokenAmount);
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

  private async determineTokensAmount(
    symbol: string,
    contract: ERC20Testnet,
    usdPrice: BigNumber,
  ): Promise<[BigNumber, BigNumber]> {
    let usdcAmount: BigNumber;
    let tokenAmount: BigNumber;
    const tokenDecimals = await contract.decimals();
    // We dont have so many WETH here, so we can only afford 10 WETH
    if (symbol === "WETH") {
      tokenAmount = BigNumber.from(10).mul(
        BigNumber.from(10).pow(tokenDecimals),
      );
      usdcAmount = tokenAmount
        .mul(usdPrice)
        .div(BigNumber.from(10).pow(tokenDecimals));
    } else {
      usdcAmount = this.usdcDecimalMult.mul(100e6);

      tokenAmount = usdcAmount
        .mul(1e8)
        .div(usdPrice)
        .mul(BigNumber.from(10).pow(tokenDecimals))
        .div(this.usdcDecimalMult);
    }

    this.log.debug(
      `${symbol} to pool: ${formatBN(tokenAmount, tokenDecimals)}`,
    );
    return [tokenAmount, usdcAmount];
  }
}
