import {
  contractParams,
  contractsByNetwork,
  ConvexPoolParams,
  CurveSteCRVPoolParams,
  gearTokens,
  LidoParams,
  NetworkType,
  priceFeedsByNetwork,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import write from "write-json-file";

import { DEPLOYED_TOKENS, Progress } from "./src";

// This script does reverse work: creates progress file from SDK constants
async function dumpSdk(network: NetworkType = "Goerli"): Promise<void> {
  const progress: Progress = {
    syncer: {},
    normalTokens: Object.fromEntries(
      Object.entries(tokenDataByNetwork[network]).filter(([t]) =>
        DEPLOYED_TOKENS.includes(t as any),
      ),
    ),
    lido: {
      LIDO_ORACLE: (contractParams.LIDO_STETH_GATEWAY as LidoParams).oracle[
        network
      ],
      STETH: tokenDataByNetwork[network].STETH,
    },
    curve: {
      "3Crv": tokenDataByNetwork[network]["3Crv"],
      CURVE_3CRV_POOL: contractsByNetwork[network].CURVE_3CRV_POOL,
      CURVE_FRAX_USDC_POOL: contractsByNetwork[network].CURVE_FRAX_USDC_POOL,
      CURVE_SUSD_POOL: contractsByNetwork[network].CURVE_SUSD_POOL,
      CURVE_SUSD_DEPOSIT: contractsByNetwork[network].CURVE_SUSD_DEPOSIT,
      CURVE_GUSD_POOL: contractsByNetwork[network].CURVE_GUSD_POOL,
      CURVE_STECRV_POOL: (
        contractParams.CURVE_STETH_GATEWAY as CurveSteCRVPoolParams
      ).pool[network],
      FRAX3CRV: tokenDataByNetwork[network].FRAX3CRV,
      LUSD3CRV: tokenDataByNetwork[network].LUSD3CRV,
      crvFRAX: tokenDataByNetwork[network].crvFRAX,
      crvPlain3andSUSD: tokenDataByNetwork[network].crvPlain3andSUSD,
      gusd3CRV: tokenDataByNetwork[network].gusd3CRV,
      steCRV: tokenDataByNetwork[network].steCRV,
    },
    convex: {
      CONVEX_3CRV_POOL: contractsByNetwork[network].CONVEX_3CRV_POOL,
      CONVEX_BOOSTER: contractsByNetwork[network].CONVEX_BOOSTER,
      CONVEX_CLAIM_ZAP: contractsByNetwork[network].CONVEX_CLAIM_ZAP,
      CONVEX_FRAX3CRV_POOL: contractsByNetwork[network].CONVEX_FRAX3CRV_POOL,
      CONVEX_FRAX3CRV_POOL_EXTRA_FXS: (
        contractParams.CONVEX_FRAX3CRV_POOL as ConvexPoolParams
      ).extraRewards[0].poolAddress[network],
      CONVEX_FRAX_USDC_POOL: contractsByNetwork[network].CONVEX_FRAX_USDC_POOL,
      CONVEX_GUSD_POOL: contractsByNetwork[network].CONVEX_GUSD_POOL,
      CONVEX_LUSD3CRV_POOL: contractsByNetwork[network].CONVEX_LUSD3CRV_POOL,
      CONVEX_LUSD3CRV_POOL_EXTRA_LQTY: (
        contractParams.CONVEX_LUSD3CRV_POOL as ConvexPoolParams
      ).extraRewards[0].poolAddress[network],
      CONVEX_STECRV_POOL: contractsByNetwork[network].CONVEX_STECRV_POOL,
      CONVEX_STECRV_POOL_EXTRA_LDO: (
        contractParams.CONVEX_STECRV_POOL as ConvexPoolParams
      ).extraRewards[0].poolAddress[network],
      CONVEX_SUSD_POOL: contractsByNetwork[network].CONVEX_SUSD_POOL,
      CONVEX_SUSD_POOL_EXTRA_SNX: (
        contractParams.CONVEX_SUSD_POOL as ConvexPoolParams
      ).extraRewards[0].poolAddress[network],
      CVX: tokenDataByNetwork[network].CVX,
      cvx3Crv: tokenDataByNetwork[network].cvx3Crv,
      cvxFRAX3CRV: tokenDataByNetwork[network].cvxFRAX3CRV,
      cvxLUSD3CRV: tokenDataByNetwork[network].cvxLUSD3CRV,
      cvxcrvFRAX: tokenDataByNetwork[network].cvxcrvFRAX,
      cvxcrvPlain3andSUSD: tokenDataByNetwork[network].cvxcrvPlain3andSUSD,
      cvxgusd3CRV: tokenDataByNetwork[network].cvxgusd3CRV,
      cvxsteCRV: tokenDataByNetwork[network].cvxsteCRV,
    },
    yearn: {
      yvCurve_FRAX: tokenDataByNetwork[network].yvCurve_FRAX,
      yvCurve_stETH: tokenDataByNetwork[network].yvCurve_stETH,
      yvDAI: tokenDataByNetwork[network].yvDAI,
      yvUSDC: tokenDataByNetwork[network].yvUSDC,
      yvWBTC: tokenDataByNetwork[network].yvWBTC,
      yvWETH: tokenDataByNetwork[network].yvWETH,
    },
    chainlink: Object.fromEntries(
      Object.entries(priceFeedsByNetwork)
        .filter(([t]) => !(t in gearTokens))
        .flatMap(([t, data]) => {
          const resp = [];
          if (data.priceFeedETH && "address" in data.priceFeedETH) {
            resp.push([`${t}/ETH`, data.priceFeedETH.address[network]]);
          }
          if (data.priceFeedUSD && "address" in data.priceFeedUSD) {
            resp.push([`${t}/USD`, data.priceFeedUSD.address[network]]);
          }
          return resp;
        }),
    ),
    tradingBot: {},
  };
  await write(`./.progress.${network.toLowerCase()}.dump.json`, progress, {
    sortKeys: true,
    indent: "  ",
  });
}

dumpSdk().catch(console.error);
