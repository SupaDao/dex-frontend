import { useReadContract, useReadContracts, useConnection } from "wagmi";
import React from "react";
import { CONTRACTS } from "@/lib/contracts/addresses";

const nftAbi = [
	{
		inputs: [{ internalType: "address", name: "owner", type: "address" }],
		name: "balanceOf",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{ internalType: "address", name: "owner", type: "address" },
			{ internalType: "uint256", name: "index", type: "uint256" },
		],
		name: "tokenOfOwnerByIndex",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
		name: "positions",
		outputs: [
			{ internalType: "uint96", name: "nonce", type: "uint96" },
			{ internalType: "address", name: "operator", type: "address" },
			{ internalType: "address", name: "pool", type: "address" },
			{ internalType: "int24", name: "tickLower", type: "int24" },
			{ internalType: "int24", name: "tickUpper", type: "int24" },
			{ internalType: "uint128", name: "liquidity", type: "uint128" },
			{
				internalType: "uint256",
				name: "feeGrowthInside0LastX128",
				type: "uint256",
			},
			{
				internalType: "uint256",
				name: "feeGrowthInside1LastX128",
				type: "uint256",
			},
			{ internalType: "uint128", name: "tokensOwed0", type: "uint128" },
			{ internalType: "uint128", name: "tokensOwed1", type: "uint128" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
		name: "tokenURI",
		outputs: [{ internalType: "string", name: "", type: "string" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export function usePositions() {
	const { address } = useConnection();

	// 1. Get Balance
	const { data: balance, refetch: refetchBalance } = useReadContract({
		address: CONTRACTS.positionNFT,
		abi: nftAbi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: !!address,
		},
	});

	const balanceCount = balance ? Number(balance) : 0;
	const indices = React.useMemo(
		() => Array.from({ length: balanceCount }, (_, i) => BigInt(i)),
		[balanceCount]
	);

	// 2. Get Token IDs
	const tokenIdsContracts = React.useMemo(
		() =>
			indices.map((index) => ({
				address: CONTRACTS.positionNFT,
				abi: nftAbi,
				functionName: "tokenOfOwnerByIndex",
				args: [address!, index],
			})),
		[address, indices]
	);

	const { data: tokenIds, refetch: refetchTokenIds } = useReadContracts({
		contracts: tokenIdsContracts,
		query: {
			enabled: balanceCount > 0,
		},
	});

	const validTokenIds = React.useMemo(
		() =>
			(tokenIds
				?.map((t) => t.result)
				.filter((t) => t !== undefined) as bigint[]) || [],
		[tokenIds]
	);

	// 3. Get Position Data & URI
	const positionContracts = React.useMemo(
		() =>
			validTokenIds.flatMap((tokenId) => [
				{
					address: CONTRACTS.positionNFT,
					abi: nftAbi,
					functionName: "positions",
					args: [tokenId],
				},
				{
					address: CONTRACTS.positionNFT,
					abi: nftAbi,
					functionName: "tokenURI",
					args: [tokenId],
				},
			]),
		[validTokenIds]
	);

	const { data: positionsData, refetch: refetchPositionsData } =
		useReadContracts({
			contracts: positionContracts,
			query: {
				enabled: validTokenIds.length > 0,
			},
		});

	const positions = validTokenIds
		.map((tokenId, i) => {
			const posRes = positionsData?.[i * 2];
			const uriRes = positionsData?.[i * 2 + 1];

			if (!posRes || posRes.status !== "success") return null;
			const data = posRes.result;
			if (!data) return null;

			const tokenUri =
				uriRes?.status === "success" ? (uriRes.result as string) : undefined;

			return {
				tokenId,
				nonce: data[0],
				operator: data[1],
				pool: data[2],
				tickLower: data[3],
				tickUpper: data[4],
				liquidity: data[5],
				feeGrowthInside0LastX128: data[6],
				feeGrowthInside1LastX128: data[7],
				tokensOwed0: data[8],
				tokensOwed1: data[9],
				tokenUri,
			};
		})
		.filter((p) => p !== null);

	return {
		positions,
		isLoading:
			balance === undefined && balanceCount > 0 && positionsData === undefined,
		refetch: async () => {
			await refetchBalance();
			await refetchTokenIds();
			await refetchPositionsData();
		},
	};
}
