"use client";

import React from "react";
import Image from "next/image";
import { formatUnits } from "viem";
import { usePools } from "@/hooks/usePools";
import Link from "next/link";
import { getDisplaySymbol } from "@/lib/contracts/tokens";
import { usePoolInfo } from "@/hooks/usePoolInfo";
import { useTokenDetails } from "@/hooks/useTokenDetails";
import { usePoolState } from "@/hooks/usePoolState";
import {
	getAmountsForLiquidity,
	getSqrtRatioAtTick,
} from "@/lib/web3/liquidityMath";

interface PositionCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	position: any; // Using any for speed, but ideally typed from usePositions
	onIncrease?: () => void;
	onRemove?: () => void;
}

export default function PositionCard({
	position,
	onIncrease,
	onRemove,
}: PositionCardProps) {
	const { pools } = usePools();
	const { data: slot0 } = usePoolState(position.pool as `0x${string}`);
	const currentTick = slot0?.[1];
	const sqrtPriceX96 = slot0?.[0];

	// Robust pool info fetching for both popular and custom pools
	const knownPool = pools.find(
		(p) => p.address.toLowerCase() === position.pool.toLowerCase()
	);

	const {
		token0: t0Addr,
		token1: t1Addr,
		fee: poolFee,
	} = usePoolInfo(!knownPool ? position.pool : undefined);

	const t0Details = useTokenDetails(knownPool?.token0.address || t0Addr);
	const t1Details = useTokenDetails(knownPool?.token1.address || t1Addr);

	const poolInfo = React.useMemo(() => {
		if (knownPool) return knownPool;

		if (t0Details.symbol && t1Details.symbol) {
			return {
				token0: {
					address: t0Addr,
					symbol: t0Details.symbol,
					decimals: t0Details.decimals || 18,
				},
				token1: {
					address: t1Addr,
					symbol: t1Details.symbol,
					decimals: t1Details.decimals || 18,
				},
				fee: poolFee,
			};
		}
		return null;
	}, [knownPool, t0Details, t1Details, t0Addr, t1Addr, poolFee]);

	const inRange =
		currentTick !== undefined &&
		currentTick >= position.tickLower &&
		currentTick < position.tickUpper;

	const isActive = BigInt(position.liquidity) > 0n;

	const { amount0, amount1 } = React.useMemo(() => {
		if (sqrtPriceX96 && position.liquidity) {
			const sqrtRatioAX96 = getSqrtRatioAtTick(Number(position.tickLower));
			const sqrtRatioBX96 = getSqrtRatioAtTick(Number(position.tickUpper));
			return getAmountsForLiquidity(
				sqrtPriceX96,
				sqrtRatioAX96,
				sqrtRatioBX96,
				BigInt(position.liquidity)
			);
		}
		return { amount0: 0n, amount1: 0n };
	}, [sqrtPriceX96, position.liquidity, position.tickLower, position.tickUpper]);

	const f0 = formatUnits(amount0, poolInfo?.token0.decimals || 18);
	const f1 = formatUnits(amount1, poolInfo?.token1.decimals || 18);

	const currentPrice = React.useMemo(() => {
		if (sqrtPriceX96) {
			const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
			return price;
		}
		return 0;
	}, [sqrtPriceX96]);

	return (
		<Link
			href={`/pools/${position.pool}`}
			className="group block overflow-hidden rounded-[32px] border border-white/5 bg-white/5 hover:border-white/10 transition-all">
			<div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
				{/* Left: Token Info & Status */}
				<div className="flex items-center gap-4">
					<div className="flex -space-x-3">
						<div className="w-12 h-12 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-lg relative z-10 overflow-hidden bg-[#1A1A1A]">
							{poolInfo?.token0.logoURI ? (
								<Image
									width={48}
									height={48}
									src={poolInfo.token0.logoURI}
									alt={poolInfo.token0.symbol}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-white font-bold text-[10px]">
									{getDisplaySymbol(
										poolInfo?.token0.symbol,
										poolInfo?.token0.address
									)?.slice(0, 3) || "T0"}
								</div>
							)}
						</div>
						<div className="w-12 h-12 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-lg overflow-hidden bg-[#1A1A1A]">
							{poolInfo?.token1.logoURI ? (
								<Image
									width={48}
									height={48}
									src={poolInfo.token1.logoURI}
									alt={poolInfo.token1.symbol}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-pink-500/10 text-white font-bold text-[10px]">
									{getDisplaySymbol(
										poolInfo?.token1.symbol,
										poolInfo?.token1.address
									)?.slice(0, 3) || "T1"}
								</div>
							)}
						</div>
					</div>

					<div>
						<div className="flex items-center gap-2 mb-0.5">
							<h3 className="font-bold text-lg text-white">
								{poolInfo
									? `${getDisplaySymbol(
											poolInfo.token0.symbol,
											poolInfo.token0.address
									  )} / ${getDisplaySymbol(
											poolInfo.token1.symbol,
											poolInfo.token1.address
									  )}`
									: "Loading symbols..."}
							</h3>
							<div className="flex items-center gap-1.5">
								<span className="text-[10px] text-[var(--brand-lime)] font-mono bg-[var(--brand-lime)]/5 px-1.5 py-0.5 rounded border border-[var(--brand-lime)]/10 uppercase font-bold">
									v1
								</span>
								<span className="text-[10px] text-zinc-500 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
									{poolInfo?.fee ? `${poolInfo.fee / 10000}%` : "0.3%"}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{isActive ? (
								inRange ? (
									<div className="flex items-center gap-1.5 text-xs font-medium text-green-400">
										<div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
										In range
									</div>
								) : (
									<div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
										<div className="w-2 h-2 rounded-full bg-yellow-400" />
										Out of range
									</div>
								)
							) : (
								<div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
									<div className="w-2 h-2 rounded-full bg-zinc-700" />
									Closed
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Middle/Right: Position Details */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12 flex-1 md:justify-end items-center">
					<div className="space-y-1 md:text-right">
						<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
							Amount
						</p>
						<div className="text-white font-medium text-xs">
							<div>
								{parseFloat(f0).toLocaleString(undefined, {
									maximumFractionDigits: 4,
								})}{" "}
								{getDisplaySymbol(poolInfo?.token0.symbol, poolInfo?.token0.address)}
							</div>
							<div>
								{parseFloat(f1).toLocaleString(undefined, {
									maximumFractionDigits: 4,
								})}{" "}
								{getDisplaySymbol(poolInfo?.token1.symbol, poolInfo?.token1.address)}
							</div>
						</div>
					</div>

					<div className="space-y-1 md:text-right">
						<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
							Price
						</p>
						<p className="text-white font-medium text-xs">
							{currentPrice > 0 ? (
								<>
									{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
									{getDisplaySymbol(poolInfo?.token1.symbol)} per{" "}
									{getDisplaySymbol(poolInfo?.token0.symbol)}
								</>
							) : (
								"-"
							)}
						</p>
					</div>

					<div className="space-y-1 md:text-right">
						<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
							APR
						</p>
						<p className="text-white font-medium">-</p>
					</div>

					<div className="flex md:flex-col lg:flex-row gap-2 md:justify-end">
						<button
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onIncrease?.();
							}}
							className="px-4 py-2 rounded-xl bg-[var(--brand-lime)] text-black font-bold text-xs hover:bg-[var(--brand-lime)]/90 transition-all shadow-lg shadow-lime-500/10">
							Increase
						</button>
						<button
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onRemove?.();
							}}
							className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all">
							Remove
						</button>
					</div>
				</div>
			</div>
		</Link>
	);
}
