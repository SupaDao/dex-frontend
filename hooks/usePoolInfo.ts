import { useReadContracts } from "wagmi";
import { type Address } from "viem";

const poolAbi = [
	{
		inputs: [],
		name: "TOKEN0",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "TOKEN1",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "FEE",
		outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export function usePoolInfo(poolAddress: Address | undefined) {
	const { data, isLoading } = useReadContracts({
		contracts: [
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "TOKEN0",
			},
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "TOKEN1",
			},
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "FEE",
			},
		],
		query: {
			enabled:
				!!poolAddress &&
				poolAddress !== "0x0000000000000000000000000000000000000000",
		},
	});

	const token0 = data?.[0]?.result as Address | undefined;
	const token1 = data?.[1]?.result as Address | undefined;
	const fee = data?.[2]?.result as number | undefined;

	return {
		token0,
		token1,
		fee,
		isLoading,
	};
}
