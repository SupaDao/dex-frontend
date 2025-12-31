import { useSimulateContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import routerAbi from "@/lib/contracts/router-abi.json";
import { Token } from "@/lib/contracts/tokens";

export function useSwapSimulation(
	tokenIn: Token,
	tokenOut: Token | undefined,
	amountIn: string,
	fee: number,
	recipient: Address
) {
	const isNativeIn =
		tokenIn.address.toLowerCase() ===
		"0x0000000000000000000000000000000000000000";
	const WETH = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

	const amountInWei =
		amountIn && !isNaN(parseFloat(amountIn))
			? parseUnits(amountIn, tokenIn.decimals)
			: 0n;

	const { data, isError, error, isLoading } = useSimulateContract({
		address: CONTRACTS.router,
		abi: routerAbi,
		functionName: "exactInputSingle",
		args:
			tokenOut && amountInWei > 0n
				? [
						{
							tokenIn: isNativeIn ? WETH : tokenIn.address,
							tokenOut:
								tokenOut.address.toLowerCase() ===
								"0x0000000000000000000000000000000000000000"
									? WETH
									: tokenOut.address,
							fee: fee,
							recipient: recipient,
							amountIn: amountInWei,
							amountOutMinimum: 0n, // Simulate with 0 min to not revert on slippage
							sqrtPriceLimitX96: BigInt(0),
							deadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
						},
				  ]
				: undefined,
		value: isNativeIn ? amountInWei : 0n,
		query: {
			enabled:
				!!tokenOut &&
				amountInWei > 0n &&
				!!recipient &&
				!isNaN(parseFloat(amountIn)),
		},
	});

	// The result of exactInputSingle is uint256 amountOut
	const amountOutReal = data?.result ? (data.result as bigint) : undefined;

	// Add debug info to help trace B->A failures
	if (isError) {
		console.warn("Simulation failed:", error);
	}

	return {
		amountOutReal,
		isLoading,
		isError,
		error,
	};
}
