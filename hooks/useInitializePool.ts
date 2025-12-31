import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address } from "viem";

const poolAbi = [
	{
		inputs: [{ internalType: "uint160", name: "sqrtPriceX96", type: "uint160" }],
		name: "initializeState",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
] as const;

export function useInitializePool() {
	const { writeContract, data: hash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	const initializePool = (poolAddress: Address, sqrtPriceX96: bigint) => {
		writeContract({
			address: poolAddress,
			abi: poolAbi,
			functionName: "initializeState",
			args: [sqrtPriceX96],
			gas: 5000000n, // 5M gas limit
		});
	};

	return {
		initializePool,
		hash,
		isPending,
		isConfirming,
		isSuccess,
		error,
	};
}
