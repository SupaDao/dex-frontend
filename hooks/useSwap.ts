import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Address, encodeFunctionData } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import routerAbi from "@/lib/contracts/router-abi.json";
import { Token } from "@/lib/contracts/tokens";

// Updated hook doesn't need args in the hook call itself if we pass them to the function
export function useSwap() {
	const { writeContract, data: hash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	const swap = (
		tokenIn: Token,
		tokenOut: Token,
		amountIn: string,
		amountOutMin: string,
		recipient: Address,
		deadline: bigint,
		fee: number
	) => {
		if (!amountIn || !tokenOut) return;

		const isNativeIn =
			tokenIn.address.toLowerCase() ===
			"0x0000000000000000000000000000000000000000";
		const isNativeOut =
			tokenOut.address.toLowerCase() ===
			"0x0000000000000000000000000000000000000000";
		const WETH = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

		const amountInWei = parseUnits(amountIn, tokenIn.decimals);
		const amountOutMinWei =
			amountOutMin && !isNaN(parseFloat(amountOutMin))
				? parseUnits(amountOutMin, tokenOut.decimals)
				: 0n;

		if (isNativeOut) {
			// Multicall: ExactInputSingle -> UnwrapWETH9
			const swapData = encodeFunctionData({
				abi: routerAbi,
				functionName: "exactInputSingle",
				args: [
					{
						tokenIn: isNativeIn ? WETH : tokenIn.address,
						tokenOut: WETH,
						fee: fee,
						recipient: CONTRACTS.router, // Send to router for unwrapping
						amountIn: amountInWei,
						amountOutMinimum: amountOutMinWei,
						sqrtPriceLimitX96: 0n,
						deadline: deadline,
					},
				],
			});

			const unwrapData = encodeFunctionData({
				abi: routerAbi,
				functionName: "unwrapWETH9",
				args: [amountOutMinWei, recipient],
			});

			writeContract({
				address: CONTRACTS.router,
				abi: routerAbi,
				functionName: "multicall",
				args: [[swapData, unwrapData]],
				value: isNativeIn ? amountInWei : 0n,
			});
		} else {
			// Single call: exactInputSingle
			writeContract({
				address: CONTRACTS.router,
				abi: routerAbi,
				functionName: "exactInputSingle",
				args: [
					{
						tokenIn: isNativeIn ? WETH : tokenIn.address,
						tokenOut: tokenOut.address,
						fee: fee,
						recipient: recipient,
						amountIn: amountInWei,
						amountOutMinimum: amountOutMinWei,
						sqrtPriceLimitX96: 0n,
						deadline: deadline,
					},
				],
				value: isNativeIn ? amountInWei : 0n,
			});
		}
	};

	const wrap = (amountIn: string) => {
		const amount = parseUnits(amountIn, 18);
		writeContract({
			address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // WETH
			abi: [
				{
					name: "deposit",
					type: "function",
					stateMutability: "payable",
					inputs: [],
					outputs: [],
				},
			],
			functionName: "deposit",
			args: [],
			value: amount,
		});
	};

	const unwrap = (amountIn: string) => {
		const amount = parseUnits(amountIn, 18);
		writeContract({
			address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // WETH
			abi: [
				{
					name: "withdraw",
					type: "function",
					stateMutability: "nonpayable",
					inputs: [{ name: "wad", type: "uint256" }],
					outputs: [],
				},
			],
			functionName: "withdraw",
			args: [amount],
		});
	};

	return {
		write: swap,
		wrap,
		unwrap,
		hash,
		isPending,
		isConfirming,
		isSuccess,
		error,
	};
}
