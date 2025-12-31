import { useReadContracts } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";

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
] as const;

const FEES = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

export function usePoolQuote(
	tokenIn: Address | undefined,
	tokenOut: Address | undefined
) {
	// 1. Get Pool Addresses for all Fee Tiers
	// Helper to handle Native ETH -> WETH for pool lookup
	const getAddressForPool = (addr: Address | undefined) =>
		!addr || addr === "0x0000000000000000000000000000000000000000"
			? "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9" // WETH Sepolia
			: addr;

	const tokenInForPool = getAddressForPool(tokenIn);
	const tokenOutForPool = getAddressForPool(tokenOut);

	const { data: poolAddresses, isLoading: isLoadingAddresses } =
		useReadContracts({
			contracts: FEES.map((fee) => ({
				address: CONTRACTS.factory,
				abi: factoryAbi,
				functionName: "getPool",
				args:
					tokenInForPool && tokenOutForPool
						? [tokenInForPool, tokenOutForPool, fee]
						: undefined,
			})),
			query: {
				enabled: !!tokenInForPool && !!tokenOutForPool,
			},
		});

	// 2. Filter active pools
	const activePools =
		poolAddresses
			?.map((result, index) => ({
				address: result.result as Address,
				fee: FEES[index],
				status: result.status,
			}))
			.filter(
				(p) =>
					p.address && p.address !== "0x0000000000000000000000000000000000000000"
			) || [];

	// Prioritize the first found pool (simplistic "Smart Router" - can be improved to check liquidity)
	const targetPool = activePools[0]?.address;
	const targetFee = activePools[0]?.fee;

	// 3. Get Slot0 for the found pool
	const { data: slot0, isLoading: isLoadingSlot0 } = useReadContracts({
		contracts: targetPool
			? [
					{
						address: targetPool,
						abi: poolAbi,
						functionName: "slot0",
					},
			  ]
			: [],
		query: {
			enabled: !!targetPool,
		},
	});

	// Return the result of the first call (slot0 tuple) + fee used
	// slot0 data structure from useReadContracts is [ { result: ... } ]
	const result = slot0?.[0]?.result;

	return {
		data: result,
		fee: targetFee,
		isLoading: isLoadingAddresses || isLoadingSlot0,
		notFound:
			!isLoadingAddresses &&
			activePools.length === 0 &&
			!!tokenInForPool &&
			!!tokenOutForPool,
	};
}
