import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { TOKENS } from "@/lib/contracts/tokens";

const factoryAbi = [
	{
		inputs: [
			{ internalType: "address", name: "tokenA", type: "address" },
			{ internalType: "address", name: "tokenB", type: "address" },
			{ internalType: "uint24", name: "fee", type: "uint24" },
		],
		name: "createPool",
		outputs: [{ internalType: "address", name: "pool", type: "address" }],
		stateMutability: "nonpayable",
		type: "function",
	},
] as const;

export function useCreatePool() {
	const {
		mutate: writeContract,
		data: hash,
		isPending,
		error,
	} = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	const createPool = (tokenA: Address, tokenB: Address, fee: number) => {
		// Handle Native ETH -> WETH
		const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
		const wethToken = TOKENS.find((t) => t.symbol === "WETH");
		const wethAddress = wethToken?.address as Address;

		const addressA = tokenA === NATIVE_ADDRESS ? wethAddress : tokenA;
		const addressB = tokenB === NATIVE_ADDRESS ? wethAddress : tokenB;

		if (!addressA || !addressB) {
			console.error("WETH address not found for creating pool");
			return;
		}

		writeContract({
			address: CONTRACTS.factory,
			abi: factoryAbi,
			functionName: "createPool",
			args: [addressA, addressB, fee],
			// gas: 10000000n,
		});
	};

	return {
		createPool,
		hash,
		isPending,
		isConfirming,
		isSuccess,
		error,
	};
}
