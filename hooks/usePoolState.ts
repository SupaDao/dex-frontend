import { useReadContract } from "wagmi";
import { type Address } from "viem";

const poolAbi = [
	{
		inputs: [],
		name: "slot0",
		outputs: [
			{ internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
			{ internalType: "int24", name: "tick", type: "int24" },
			{ internalType: "uint16", name: "observationIndex", type: "uint16" },
			{ internalType: "uint16", name: "observationCardinality", type: "uint16" },
			{
				internalType: "uint16",
				name: "observationCardinalityNext",
				type: "uint16",
			},
			{ internalType: "uint8", name: "feeProtocol", type: "uint8" },
			{ internalType: "bool", name: "unlocked", type: "bool" },
		],
		stateMutability: "view",
		type: "function",
	},
] as const;

export function usePoolState(poolAddress: Address | undefined) {
	const result = useReadContract({
		address: poolAddress,
		abi: poolAbi,
		functionName: "slot0",
		enabled:
			!!poolAddress &&
			poolAddress !== "0x0000000000000000000000000000000000000000",
		query: {
			refetchInterval: 5000,
		},
	});

	return {
		...result,
		refetch: result.refetch,
	};
}
