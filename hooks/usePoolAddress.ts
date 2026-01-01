import { useReadContract } from "wagmi";
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

export function usePoolAddress(
	tokenA: Address | undefined,
	tokenB: Address | undefined,
	fee: number = 500
) {
	const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
	const wethToken = TOKENS.find((t) => t.symbol === "WETH");
	const wethAddress = wethToken?.address as Address;

	const addressA = tokenA === NATIVE_ADDRESS ? wethAddress : tokenA;
	const addressB = tokenB === NATIVE_ADDRESS ? wethAddress : tokenB;

	return useReadContract({
		address: CONTRACTS.factory,
		abi: factoryAbi,
		functionName: "getPool",
		args: addressA && addressB ? [addressA, addressB, fee] : undefined,
		query: {
			enabled: !!addressA && !!addressB,
		},
	});
}
