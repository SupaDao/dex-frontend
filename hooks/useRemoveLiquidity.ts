import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, encodeFunctionData } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";

const nftManagerAbi = [
	{
		inputs: [{ internalType: "bytes[]", name: "data", type: "bytes[]" }],
		name: "multicall",
		outputs: [{ internalType: "bytes[]", name: "results", type: "bytes[]" }],
		stateMutability: "payable",
		type: "function",
	},
	{
		inputs: [
			{
				components: [
					{ internalType: "uint256", name: "tokenId", type: "uint256" },
					{ internalType: "uint128", name: "amount", type: "uint128" },
					{ internalType: "uint256", name: "amount0Min", type: "uint256" },
					{ internalType: "uint256", name: "amount1Min", type: "uint256" },
					{ internalType: "uint256", name: "deadline", type: "uint256" },
				],
				internalType: "struct LiquidityPositionNFT.DecreaseLiquidityParams",
				name: "params",
				type: "tuple",
			},
		],
		name: "decreaseLiquidity",
		outputs: [
			{ internalType: "uint256", name: "amount0", type: "uint256" },
			{ internalType: "uint256", name: "amount1", type: "uint256" },
		],
		stateMutability: "payable",
		type: "function",
	},
	{
		inputs: [
			{
				components: [
					{ internalType: "uint256", name: "tokenId", type: "uint256" },
					{ internalType: "address", name: "recipient", type: "address" },
					{ internalType: "uint128", name: "amount0Max", type: "uint128" },
					{ internalType: "uint128", name: "amount1Max", type: "uint128" },
				],
				internalType: "struct INonfungiblePositionManager.CollectParams",
				name: "params",
				type: "tuple",
			},
		],
		name: "collect",
		outputs: [
			{ internalType: "uint256", name: "amount0", type: "uint256" },
			{ internalType: "uint256", name: "amount1", type: "uint256" },
		],
		stateMutability: "payable",
		type: "function",
	},
] as const;

export function useRemoveLiquidity() {
	const { writeContract, data: hash, isPending, error } = useWriteContract();

	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	const removeLiquidity = async (
		tokenId: bigint,
		liquidityMatches: bigint, // Amount of liquidity to remove
		amount0Min: bigint,
		amount1Min: bigint,
		recipient: Address
	) => {
		const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

		// 1. Encode decreaseLiquidity
		const decreaseLiquidityData = encodeFunctionData({
			abi: nftManagerAbi,
			functionName: "decreaseLiquidity",
			args: [
				{
					tokenId,
					amount: liquidityMatches,
					amount0Min,
					amount1Min,
					deadline,
				},
			],
		});

		// 2. Encode collect (collect all owed/burned tokens)
		// We set max amounts to max uint128 to collect everything available
		const maxUint128 = 340282366920938463463374607431768211455n;
		const collectData = encodeFunctionData({
			abi: nftManagerAbi,
			functionName: "collect",
			args: [
				{
					tokenId,
					recipient,
					amount0Max: maxUint128,
					amount1Max: maxUint128,
				},
			],
		});

		// 3. Multicall
		writeContract({
			address: CONTRACTS.positionNFT,
			abi: nftManagerAbi,
			functionName: "multicall",
			args: [[decreaseLiquidityData, collectData]],
		});
	};

	return {
		removeLiquidity,
		isPending,
		isConfirming,
		isSuccess,
		hash,
		error,
	};
}
