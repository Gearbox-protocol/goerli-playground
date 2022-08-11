import { BigNumber, BigNumberish } from "ethers";

export function formatBN(
  num?: BigNumberish,
  decimals?: number,
  precision?: number
): string {
  let p = precision ?? 4;
  if (!num) {
    return "-";
  }

  if (BigNumber.from(num).gt(BigNumber.from(10).pow(28))) {
    return "MAX";
  }

  if (BigNumber.from(num).gt(BigNumber.from(10).pow(21))) {
    p = 2;
  }

  if (BigNumber.from(num).gt(BigNumber.from(10).pow(24))) {
    p = 0;
  }

  return !decimals || decimals >= 4
    ? (
        BigNumber.from(num)
          .div(BigNumber.from(10).pow((decimals || 18) - 4))
          .toNumber() / 10000
      ).toFixed(p)
    : (BigNumber.from(num).toNumber() / (10 ^ decimals)).toFixed(p);
}

export function toBN(num: number, decimals?: number): BigNumber {
  return BigNumber.from(Math.floor(num * 10000)).mul(
    BigNumber.from(10).pow((decimals || 18) - 4)
  );
}

export function formatRate(rate: BigNumberish | undefined): string {
  return rate
    ? (
        BigNumber.from(rate).div(BigNumber.from(10).pow(14)).toNumber() / 100
      ).toFixed(2) + "%"
    : "0.00%";
}
