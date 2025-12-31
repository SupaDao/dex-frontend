"use client";

import React from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { type Address } from "viem";
import { Layers, Activity, DollarSign, TrendingUp } from "lucide-react";
import {
	TOKENS,
	getTokenByAddress,
	getDisplaySymbol,
} from "@/lib/contracts/tokens";
import { getTickAtPrice, getPriceFromTick } from "@/lib/web3/liquidityMath";

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
	{
		inputs: [],
		name: "fee",
		outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
		stateMutability: "view",
		type: "function",
	},
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
] as const;

interface PoolStatsProps {
	poolAddress: Address;
}

export default function PoolStats({ poolAddress }: PoolStatsProps) {
	const { data, isLoading } = useReadContracts({
		contracts: [
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "slot0",
			},
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "liquidity",
			},
			{
				address: poolAddress,
				abi: poolAbi,
				functionName: "fee",
			},
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
		],
	});

	const token0Addr = data?.[3]?.result as Address | undefined;
	const token1Addr = data?.[4]?.result as Address | undefined;

	// Fetch dynamic metadata for custom tokens
	const { data: tokenMetaData } = useReadContracts({
		contracts: [
			{
				address: token0Addr,
				abi: [
					{
						inputs: [],
						name: "symbol",
						outputs: [{ type: "string" }],
						stateMutability: "view",
						type: "function",
					},
				] as const,
				functionName: "symbol",
			},
			{
				address: token0Addr,
				abi: [
					{
						inputs: [],
						name: "decimals",
						outputs: [{ type: "uint8" }],
						stateMutability: "view",
						type: "function",
					},
				] as const,
				functionName: "decimals",
			},
			{
				address: token1Addr,
				abi: [
					{
						inputs: [],
						name: "symbol",
						outputs: [{ type: "string" }],
						stateMutability: "view",
						type: "function",
					},
				] as const,
				functionName: "symbol",
			},
			{
				address: token1Addr,
				abi: [
					{
						inputs: [],
						name: "decimals",
						outputs: [{ type: "uint8" }],
						stateMutability: "view",
						type: "function",
					},
				] as const,
				functionName: "decimals",
			},
		],
		enabled: !!token0Addr && !!token1Addr,
	});

	if (isLoading || !data) {
		return <div className="animate-pulse bg-white/5 h-48 rounded-3xl" />;
	}

	const slot0 = data[0].result as any;
	const liquidity = data[1].result as bigint;
	const fee = data[2].result as number;

	const t0Meta = getTokenByAddress(token0Addr || "");
	const t1Meta = getTokenByAddress(token1Addr || "");

	const token0 = {
		symbol: t0Meta?.symbol || (tokenMetaData?.[0]?.result as string) || "T0",
		decimals: t0Meta?.decimals || (tokenMetaData?.[1]?.result as number) || 18,
	};
	const token1 = {
		symbol: t1Meta?.symbol || (tokenMetaData?.[2]?.result as string) || "T1",
		decimals: t1Meta?.decimals || (tokenMetaData?.[3]?.result as number) || 18,
	};

	// Calculate Price from Tick
	// tick is inside slot0[1] usually, checking struct...
	// wagmi result might be array or object depending on ABI
	// slot0 returns a tuple. data[0].result is that tuple.
	// We cast it to any to access properties, usually it's array-like or object if named.
	// Let's assume standard wagmi return: array if output unnamed, or object if named.
	// Our ABI has names.

	const tick = slot0 ? Number(slot0[1]) : 0;
	// Price Token1 per Token0 = 1.0001^tick
	// But we need to adjust for decimals.
	// Simplified display:
	const rawPrice = Math.pow(1.0001, tick);
	const decimalDiff = token1.decimals - token0.decimals;
	const adjustedPrice = rawPrice / Math.pow(10, decimalDiff);

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			{/* TVL / Liquidity */}
			<div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
				<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
					<Layers className="w-16 h-16" />
				</div>
				<div className="relative z-10">
					<div className="text-zinc-400 text-sm font-medium mb-1 flex items-center gap-2">
						<Layers className="w-4 h-4" />
						Active Liquidity
					</div>
					<div className="text-3xl font-bold text-white">
						{liquidity ? formatUnits(liquidity, 18).slice(0, 8) : "0"}
						<span className="text-sm text-zinc-500 ml-2 font-normal">UNITS</span>
					</div>
				</div>
			</div>

			{/* Price */}
			<div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
				<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
					<TrendingUp className="w-16 h-16" />
				</div>
				<div className="relative z-10">
					<div className="text-zinc-400 text-sm font-medium mb-1 flex items-center gap-2">
						<TrendingUp className="w-4 h-4" />
						Current Price
					</div>
					<div className="text-3xl font-bold text-white">
						{adjustedPrice.toFixed(4)}
						<span className="text-sm text-zinc-500 ml-2 font-normal">
							{getDisplaySymbol(token1.symbol, token1.address)}/
							{getDisplaySymbol(token0.symbol, token0.address)}
						</span>
					</div>
				</div>
			</div>

			{/* Fee Tier */}
			<div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
				<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
					<Activity className="w-16 h-16" />
				</div>
				<div className="relative z-10">
					<div className="text-zinc-400 text-sm font-medium mb-1 flex items-center gap-2">
						<Activity className="w-4 h-4" />
						Fee Tier
					</div>
					<div className="text-3xl font-bold text-white">
						{fee ? fee / 10000 : 0}%
						<span className="text-xs bg-[var(--brand-lime)]/20 text-[var(--brand-lime)] px-2 py-1 rounded-full ml-3 align-middle font-bold border border-[var(--brand-lime)]/20">
							TIER
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
