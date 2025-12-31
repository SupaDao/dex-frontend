import { useReadContracts } from "wagmi";
import React from "react";
import { type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { TOKENS } from "@/lib/contracts/tokens";

const factoryAbi = [
	{
		inputs: [
			{ internalType: "address", name: "", type: "address" },
			{ internalType: "address", name: "", type: "address" },
			{ internalType: "uint24", name: "", type: "uint24" },
		],
		name: "getPool",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

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
	{
		inputs: [],
		name: "liquidity",
		outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

// Generate list of potential pairs from TOKENS list
// In a real app we might fetch this from a subgraph
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const POPULAR_PAIRS: any[] = [];
for (let i = 0; i < TOKENS.length; i++) {
	for (let j = i + 1; j < TOKENS.length; j++) {
		POPULAR_PAIRS.push({
			token0: TOKENS[i],
			token1: TOKENS[j],
			fee: 500, // Default fee tier 0.05%
		});
	}
}

export function usePools() {
	// 1. Get pool addresses for pairs
	const poolAddressContracts = React.useMemo(
		() =>
			POPULAR_PAIRS.map((pair) => ({
				address: CONTRACTS.factory,
				abi: factoryAbi,
				functionName: "getPool",
				args: [pair.token0.address, pair.token1.address, pair.fee],
			})),
		[]
	);

	const { data: poolAddresses, refetch: refetchPoolAddresses } =
		useReadContracts({
			contracts: poolAddressContracts,
		});

	// 2. Filter existing pools
	const existingPools = React.useMemo(
		() =>
			poolAddresses
				?.map((result, index) => ({
					...POPULAR_PAIRS[index],
					address: result.result as Address | undefined,
				}))
				.filter(
					(pool) =>
						pool.address &&
						pool.address !== "0x0000000000000000000000000000000000000000"
				) || [],
		[poolAddresses]
	);

	// 3. Fetch pool data (slot0, liquidity)
	const poolDataContracts = React.useMemo(
		() =>
			existingPools.flatMap((pool) => [
				{
					address: pool.address!,
					abi: poolAbi,
					functionName: "slot0",
				},
				{
					address: pool.address!,
					abi: poolAbi,
					functionName: "liquidity",
				},
			]),
		[existingPools]
	);

	const { data: poolData, refetch: refetchPoolData } = useReadContracts({
		contracts: poolDataContracts,
	});

	// 4. Combine data
	const pools = existingPools.map((pool, index) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const slot0 = poolData?.[index * 2]?.result as any;
		const liquidity = poolData?.[index * 2 + 1]?.result as bigint;

		return {
			...pool,
			slot0,
			liquidity,
		};
	});

	return {
		pools,
		refetch: async () => {
			await refetchPoolAddresses();
			await refetchPoolData();
		},
	};
}
