import {
  ConvexLPToken,
  ConvexPoolContract,
  CurveLPToken,
  CurvePoolContract,
  NormalToken,
  normalTokens,
  SupportedToken,
  tokenDataByNetwork,
  YearnLPToken,
} from "@gearbox-protocol/sdk";

export type CurveProgressKey =
  | CurveLPToken
  | CurvePoolContract
  | "CURVE_STECRV_POOL";

export type DeployedToken = Exclude<NormalToken, "WETH" | "STETH" | "CVX">;
export const DEPLOYED_TOKENS: DeployedToken[] = (
  Object.keys(normalTokens) as NormalToken[]
).filter(
  (t: NormalToken): t is DeployedToken => !["WETH", "STETH", "CVX"].includes(t),
);

export type ConvexExtraRewardPool =
  `${ConvexPoolContract}_EXTRA_${DeployedToken}`;

export type ChainlinkSuffix = "ETH" | "USD";

export type ChainlinkProgressKey = `${SupportedToken}/${ChainlinkSuffix}`;

export type ConvexProgressKey =
  | ConvexLPToken
  | ConvexPoolContract
  | ConvexExtraRewardPool
  | "CVX"
  | "TESTNET_CONVEX_MANAGER"
  | "CONVEX_BOOSTER"
  | "CONVEX_CLAIM_ZAP";

/**
 * This interface describes intermediate deployment state
 * JSON files follow this schema
 */
export interface Progress {
  syncer?: {
    address?: string;
  };
  normalTokens?: {
    [key in DeployedToken]?: string;
  };
  lido?: {
    LIDO_ORACLE?: string;
    STETH?: string;
  };
  curve?: {
    [key in CurveProgressKey]?: string;
  };
  convex?: {
    [key in ConvexProgressKey]?: string;
  };
  yearn?: {
    [key in YearnLPToken]?: string;
  };
  chainlink?: {
    [key in ChainlinkProgressKey]?: string;
  };
  tradingBot?: {
    address?: string;
  };
}
