import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { TOKENS } from "@/lib/contracts/tokens";

const nftAbi = [
	{
		inputs: [
			{
				components: [
					{ internalType: "address", name: "token0", type: "address" },
					{ internalType: "address", name: "token1", type: "address" },
					{ internalType: "uint24", name: "fee", type: "uint24" },
					{ internalType: "int24", name: "tickLower", type: "int24" },
					{ internalType: "int24", name: "tickUpper", type: "int24" },
					{ internalType: "uint128", name: "amount", type: "uint128" },
					{ internalType: "uint256", name: "amount0Max", type: "uint256" },
					{ internalType: "uint256", name: "amount1Max", type: "uint256" },
					{ internalType: "address", name: "recipient", type: "address" },
					{ internalType: "uint256", name: "deadline", type: "uint256" },
				],
				internalType: "struct LiquidityPositionNFT.MintParams",
				name: "params",
				type: "tuple",
			},
		],
		name: "mint",
		outputs: [
			{ internalType: "uint256", name: "tokenId", type: "uint256" },
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
					{ internalType: "uint128", name: "amount", type: "uint128" },
					{ internalType: "uint256", name: "amount0Max", type: "uint256" },
					{ internalType: "uint256", name: "amount1Max", type: "uint256" },
					{ internalType: "uint256", name: "deadline", type: "uint256" },
				],
				internalType: "struct LiquidityPositionNFT.IncreaseLiquidityParams",
				name: "params",
				type: "tuple",
			},
		],
		name: "increaseLiquidity",
		outputs: [
			{ internalType: "uint256", name: "amount0", type: "uint256" },
			{ internalType: "uint256", name: "amount1", type: "uint256" },
		],
		stateMutability: "payable",
		type: "function",
	},
] as const;

export function useMintPosition() {
	const { writeContract, data: hash, isPending, error } = useWriteContract();
	const {
		isLoading: isConfirming,
		isSuccess,
		data: receipt,
	} = useWaitForTransactionReceipt({
		hash,
	});

	const mintWithLiquidity = (
		token0: Address,
		token1: Address,
		fee: number,
		tickLower: number,
		tickUpper: number,
		liquidity: bigint,
		amount0Max: bigint,
		amount1Max: bigint,
		recipient: Address
	) => {
		// 1. Handle Native ETH (0x0 -> WETH)
		const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
		const WETH = TOKENS.find((t) => t.symbol === "WETH")?.address as Address;

		if (!WETH) {
			console.error("WETH token not found in configuration");
			return;
		}

		let token0Addr = token0;
		let token1Addr = token1;
		let val = 0n;

		if (token0 === NATIVE_ADDRESS) {
			token0Addr = WETH;
			val += amount0Max;
		}
		if (token1 === NATIVE_ADDRESS) {
			token1Addr = WETH;
			val += amount1Max;
		}

		// 2. Sort Tokens (Uniswap V3 requires token0 < token1)
		const isSorted = token0Addr.toLowerCase() < token1Addr.toLowerCase();
		const sortedToken0 = isSorted ? token0Addr : token1Addr;
		const sortedToken1 = isSorted ? token1Addr : token0Addr;

		const sortedAmount0Max = isSorted ? amount0Max : amount1Max;
		const sortedAmount1Max = isSorted ? amount1Max : amount0Max;

		// Note: 'tickLower' and 'tickUpper' also depend on order!
		let finalTickLower = tickLower;
		let finalTickUpper = tickUpper;

		if (!isSorted) {
			finalTickLower = -tickUpper;
			finalTickUpper = -tickLower;
		}

		writeContract({
			address: CONTRACTS.positionNFT,
			abi: nftAbi,
			functionName: "mint",
			args: [
				{
					token0: sortedToken0,
					token1: sortedToken1,
					fee,
					tickLower: finalTickLower,
					tickUpper: finalTickUpper,
					amount: liquidity,
					amount0Max: sortedAmount0Max,
					amount1Max: sortedAmount1Max,
					recipient,
					deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
				},
			],
			gas: 5000000n,
			value: val,
		});
	};

	const increaseLiquidity = (
		tokenId: bigint,
		token0: Address,
		token1: Address,
		liquidity: bigint,
		amount0Max: bigint,
		amount1Max: bigint
	) => {
		const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
		const WETH = TOKENS.find((t) => t.symbol === "WETH")?.address as Address;
		let val = 0n;

		if (token0 === NATIVE_ADDRESS) {
			val += amount0Max;
		}
		if (token1 === NATIVE_ADDRESS) {
			val += amount1Max;
		}

		// Sort tokens/amounts for parameter passing
		const t0Addr = token0 === NATIVE_ADDRESS ? WETH : token0;
		const t1Addr = token1 === NATIVE_ADDRESS ? WETH : token1;
		const isSorted = t0Addr.toLowerCase() < t1Addr.toLowerCase();

		const sortedAmount0Max = isSorted ? amount0Max : amount1Max;
		const sortedAmount1Max = isSorted ? amount1Max : amount0Max;

		writeContract({
			address: CONTRACTS.positionNFT,
			abi: nftAbi,
			functionName: "increaseLiquidity",
			args: [
				{
					tokenId,
					amount: liquidity,
					amount0Max: sortedAmount0Max,
					amount1Max: sortedAmount1Max,
					deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
				},
			],
			gas: 5000000n,
			value: val,
		});
	};

	return {
		mint: mintWithLiquidity,
		increaseLiquidity,
		hash,
		receipt,
		isPending,
		isConfirming,
		isSuccess,
		error,
	};
}
