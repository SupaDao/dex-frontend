// Basic Liquidity Math for V3
// Reference: https://github.com/Uniswap/v3-periphery/blob/main/contracts/libraries/LiquidityAmounts.sol

export function getLiquidityForAmounts(
	sqrtRatioCurrentX96: bigint,
	sqrtRatioAX96: bigint,
	sqrtRatioBX96: bigint,
	amount0: bigint,
	amount1: bigint
): bigint {
	let low = sqrtRatioAX96;
	let high = sqrtRatioBX96;
	if (low > high) {
		[low, high] = [high, low];
	}

	if (sqrtRatioCurrentX96 <= low) {
		return getLiquidityForAmount0(low, high, amount0);
	} else if (sqrtRatioCurrentX96 < high) {
		const liquidity0 = getLiquidityForAmount0(sqrtRatioCurrentX96, high, amount0);
		const liquidity1 = getLiquidityForAmount1(low, sqrtRatioCurrentX96, amount1);
		return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
	} else {
		return getLiquidityForAmount1(low, high, amount1);
	}
}

export function getAmountsForLiquidity(
	sqrtRatioCurrentX96: bigint,
	sqrtRatioAX96: bigint,
	sqrtRatioBX96: bigint,
	liquidity: bigint
): { amount0: bigint; amount1: bigint } {
	let low = sqrtRatioAX96;
	let high = sqrtRatioBX96;
	if (low > high) {
		[low, high] = [high, low];
	}

	let amount0 = 0n;
	let amount1 = 0n;

	const Q96 = BigInt(2 ** 96);

	if (sqrtRatioCurrentX96 <= low) {
		// Only Token0
		amount0 = (liquidity * Q96 * (high - low)) / (high * low);
	} else if (sqrtRatioCurrentX96 < high) {
		// Both Token0 and Token1
		amount0 =
			(liquidity * Q96 * (high - sqrtRatioCurrentX96)) /
			(high * sqrtRatioCurrentX96);
		amount1 = (liquidity * (sqrtRatioCurrentX96 - low)) / Q96;
	} else {
		// Only Token1
		amount1 = (liquidity * (high - low)) / Q96;
	}

	return { amount0, amount1 };
}

function getLiquidityForAmount0(
	sqrtRatioAX96: bigint,
	sqrtRatioBX96: bigint,
	amount0: bigint
): bigint {
	if (sqrtRatioAX96 > sqrtRatioBX96)
		[sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];

	const Q96 = BigInt(2 ** 96);
	const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
	const denominator = (sqrtRatioBX96 - sqrtRatioAX96) * Q96;

	return numerator / denominator;
}

function getLiquidityForAmount1(
	sqrtRatioAX96: bigint,
	sqrtRatioBX96: bigint,
	amount1: bigint
): bigint {
	if (sqrtRatioAX96 > sqrtRatioBX96)
		[sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];

	const Q96 = BigInt(2 ** 96);
	return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

export function getSqrtRatioAtTick(tick: number): bigint {
	return BigInt(Math.floor(Math.pow(1.0001, tick / 2) * 2 ** 96));
}

export function getTickAtPrice(price: number): number {
	return Math.floor(Math.log(price) / Math.log(1.0001));
}

export function getPriceFromTick(tick: number): number {
	return Math.pow(1.0001, tick);
}
