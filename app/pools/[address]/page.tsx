"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	ExternalLink,
	Info,
	MoreHorizontal,
	Settings,
} from "lucide-react";
import { type Address } from "viem";
import { usePositions } from "@/hooks/usePositions";
import { usePools } from "@/hooks/usePools";
import { usePoolState } from "@/hooks/usePoolState";
import { cn, extractSvgFromTokenUri } from "@/lib/utils";
import AnimatedGrid from "@/components/ui/AnimatedGrid";
import LiquidityModals, {
	LiquidityModalType,
} from "@/components/pools/LiquidityModals";
import { usePoolInfo } from "@/hooks/usePoolInfo";
import { useTokenDetails } from "@/hooks/useTokenDetails";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { getDisplaySymbol, getTokenByAddress } from "@/lib/contracts/tokens";
import { formatUnits } from "viem";
import PriceMovementChart from "@/components/pools/PriceMovementChart";
import {
	getAmountsForLiquidity,
	getSqrtRatioAtTick,
} from "@/lib/web3/liquidityMath";
import Image from "next/image";

export default function PoolDetailsPage() {
	const params = useParams();
	const poolAddress = params.address as Address;

	const { positions, refetch: refetchPositions } = usePositions();
	const { pools, refetch: refetchPools } = usePools();
	const { data: slot0, refetch: refetchPoolState } = usePoolState(poolAddress);

	// Try to find pool in hooks if popular, else fetch directly
	const knownPool = pools.find(
		(p) => p.address.toLowerCase() === poolAddress.toLowerCase()
	);

	const {
		token0: t0Addr,
		token1: t1Addr,
		fee: poolFee,
	} = usePoolInfo(!knownPool ? poolAddress : undefined);

	const t0Details = useTokenDetails(knownPool?.token0.address || t0Addr);
	const t1Details = useTokenDetails(knownPool?.token1.address || t1Addr);

	const pool = React.useMemo(() => {
		if (knownPool) return knownPool;
		if (!t0Addr || !t1Addr) return null;

		const s0 = getDisplaySymbol(
			getTokenByAddress(t0Addr)?.symbol || t0Details.symbol || t0Addr.slice(0, 6),
			t0Addr
		);
		const s1 = getDisplaySymbol(
			getTokenByAddress(t1Addr)?.symbol || t1Details.symbol || t1Addr.slice(0, 6),
			t1Addr
		);

		return {
			address: poolAddress,
			token0: {
				address: t0Addr,
				symbol: s0,
				decimals: t0Details.decimals || 18,
			},
			token1: {
				address: t1Addr,
				symbol: s1,
				decimals: t1Details.decimals || 18,
			},
			fee: poolFee,
		};
	}, [knownPool, poolAddress, t0Addr, t1Addr, t0Details, t1Details, poolFee]);

	const poolPositions = positions.filter(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(p: any) => p.pool && p.pool.toLowerCase() === poolAddress.toLowerCase()
	);

	const position = poolPositions[0]; // For now taking first one

	// USD Prices
	const { price: price0 } = useTokenPrice(pool?.token0.symbol);
	const { price: price1 } = useTokenPrice(pool?.token1.symbol);

	// Modal State
	const [modalType, setModalType] = React.useState<LiquidityModalType>(null);
	const [selectedTokenId, setSelectedTokenId] = React.useState<
		string | undefined
	>();
	const [isModalOpen, setIsModalOpen] = React.useState(false);
	const [showNFT, setShowNFT] = React.useState(false);

	const openModal = (type: LiquidityModalType, tokenId?: string) => {
		setModalType(type);
		setSelectedTokenId(tokenId);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const handleSuccess = React.useCallback(() => {
		refetchPositions();
		refetchPools();
		refetchPoolState?.();
	}, [refetchPositions, refetchPools, refetchPoolState]);

	// Calculate current price from slot0
	const sqrtPriceX96 = slot0?.[0];
	const currentPrice = React.useMemo(() => {
		if (!sqrtPriceX96) return null;
		// Price = (sqrtPriceX96 / 2^96)^2
		const Q96 = 2n ** 96n;
		const price = Number(sqrtPriceX96) / Number(Q96);
		const priceSquared = price * price;
		return priceSquared;
	}, [sqrtPriceX96]);

	// Format position values precisely
	const { amount0, amount1 } = React.useMemo(() => {
		if (sqrtPriceX96 && position && position.liquidity) {
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
	}, [sqrtPriceX96, position]);

	const f0 = formatUnits(amount0, pool?.token0.decimals || 18);
	const f1 = formatUnits(amount1, pool?.token1.decimals || 18);

	const positionValue0 = parseFloat(f0).toFixed(4);
	const positionValue1 = parseFloat(f1).toFixed(4);

	// Calculate fees
	const feesEarnedUSD = React.useMemo(() => {
		if (!position || !pool) return 0;
		const fee0 = Number(position.tokensOwed0) / 10 ** pool.token0.decimals;
		const fee1 = Number(position.tokensOwed1) / 10 ** pool.token1.decimals;
		return fee0 * (price0 || 0) + fee1 * (price1 || 0);
	}, [position, pool, price0, price1]);

	const totalFeesRaw = React.useMemo(() => {
		if (!position || !pool) return 0;
		const fee0 = Number(position.tokensOwed0) / 10 ** pool.token0.decimals;
		const fee1 = Number(position.tokensOwed1) / 10 ** pool.token1.decimals;
		return fee0 + fee1;
	}, [position, pool]);

	return (
		<main className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 bg-black">
			<AnimatedGrid />

			<div className="max-w-300 mx-auto space-y-8 relative z-10">
				{/* Compact Header */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex items-center gap-4">
						<Link
							href="/pools"
							className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-colors">
							<ArrowLeft className="w-5 h-5" />
						</Link>

						<div className="flex items-center gap-4">
							<div className="flex -space-x-2">
								<div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-950 flex items-center justify-center text-xs font-bold font-mono">
									{getDisplaySymbol(pool?.token0.symbol, pool?.token0.address).slice(
										0,
										1
									) || "T"}
								</div>
								<div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-xs font-bold font-mono">
									{getDisplaySymbol(pool?.token1.symbol, pool?.token1.address).slice(
										0,
										1
									) || "T"}
								</div>
							</div>
							<div>
								<h1 className="text-2xl font-medium text-white flex items-center gap-3">
									{pool ? `${pool.token0.symbol} / ${pool.token1.symbol}` : "Loading..."}
									<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-lime/5 border border-brand-lime/10 text-brand-lime">
										<span className="text-[10px] uppercase font-bold">v1</span>
										<span className="text-[10px] text-zinc-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
											{pool?.fee ? `${pool.fee / 10000}%` : "0.3%"}
										</span>
									</div>
								</h1>
								<div className="flex items-center gap-2 mt-0.5">
									<div className="flex items-center gap-1.5 text-xs font-medium text-green-400">
										<div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
										In range
									</div>
									<span className="text-zinc-600 font-mono text-xs">Base</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={() => openModal("increase", position?.tokenId.toString())}
							className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors">
							{position ? "Increase liquidity" : "Add liquidity"}
						</button>
						<button
							onClick={() => openModal("remove", position?.tokenId.toString())}
							className={cn(
								"px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors",
								!position && "opacity-50 cursor-not-allowed pointer-events-none"
							)}>
							Remove liquidity
						</button>
						<button className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white">
							<Settings className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Two Column Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
					{/* Left: Chart/Visualization Area */}
					<div className="space-y-6">
						<div className="flex items-center justify-between px-2">
							<div className="text-3xl font-medium text-white flex items-center gap-3">
								{currentPrice && pool
									? `${currentPrice.toFixed(6)} ${pool.token1.symbol} = 1 ${
											pool.token0.symbol
									  }`
									: "Loading price..."}
								<button className="p-1 rounded hover:bg-white/5 text-zinc-500">
									<MoreHorizontal className="w-4 h-4" />
								</button>
							</div>
						</div>

						<div className="relative aspect-video w-full rounded-[40px] border border-white/5 bg-[#121212] overflow-hidden">
							{showNFT && position?.tokenUri ? (
								<div className="p-8 flex items-center justify-center h-full">
									{position.tokenUri && (
										<Image
											key={position.tokenId.toString()}
											src={extractSvgFromTokenUri(position.tokenUri) || ""}
											alt="Position NFT"
											width={350}
											height={550}
											className="max-w-full max-h-full object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement;
												target.src = "/placeholder-nft.png"; // Fallback if still broken
											}}
										/>
									)}
								</div>
							) : (
								<div className="w-full h-full p-4">
									{pool ? (
										<PriceMovementChart
											symbol0={pool.token0.symbol}
											symbol1={pool.token1.symbol}
											currentPrice={currentPrice || 0}
										/>
									) : (
										<div className="flex items-center justify-center h-full text-zinc-500">
											Loading chart...
										</div>
									)}
								</div>
							)}
						</div>

						{/* Chart Tabs */}
						<div className="flex items-center justify-between">
							<div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
								{/* Time tabs moved inside Chart component for cleaner UI */}
								<div className="text-xs text-zinc-500 px-3 py-1.5">Price History</div>
							</div>
							<div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
								<button
									onClick={() => setShowNFT(false)}
									className={cn(
										"px-5 py-1.5 rounded-xl text-xs font-medium transition-colors",
										!showNFT ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
									)}>
									Chart
								</button>
								<button
									onClick={() => setShowNFT(true)}
									className={cn(
										"px-5 py-1.5 rounded-xl text-xs font-medium transition-colors",
										showNFT ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
									)}>
									NFT
								</button>
							</div>
						</div>
					</div>

					{/* Right: Info Cards Sidebar */}
					<div className="space-y-6">
						{/* Position Value Card */}
						<div className="rounded-4xl border border-white/5 bg-[#121212] p-8 space-y-6">
							<div className="flex items-center justify-between">
								<p className="text-zinc-500 font-medium">Position</p>
								<button className="text-zinc-400 hover:text-white">
									<ExternalLink className="w-4 h-4" />
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
										{price0 && pool
											? `$${(price0 * parseFloat(positionValue0)).toFixed(2)}`
											: "USD value unavailable"}
										<Info className="w-3.5 h-3.5" />
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-bold">
												{pool?.token0.symbol.slice(0, 1) || "T"}
											</div>
											<span className="text-2xl font-medium text-white">
												{positionValue0}
											</span>
										</div>
										<span className="text-zinc-500 text-sm font-mono">
											{pool?.token0.symbol || "TOKEN0"}
										</span>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2">
									<div className="flex items-center gap-3">
										<div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] font-bold">
											{pool?.token1.symbol.slice(0, 1) || "T"}
										</div>
										<span className="text-2xl font-medium text-white">
											{positionValue1}
										</span>
									</div>
									<span className="text-zinc-500 text-sm font-mono">
										{pool?.token1.symbol || "TOKEN1"}
									</span>
								</div>
							</div>
						</div>

						{/* Fees Earned Card */}
						<div className="rounded-4xl border border-white/5 bg-[#121212] p-8 space-y-6">
							<p className="text-zinc-500 font-medium">Fees earned</p>

							<div className="space-y-1">
								<p className="text-5xl font-medium text-white">
									{feesEarnedUSD > 0
										? `$${feesEarnedUSD.toFixed(2)}`
										: totalFeesRaw > 0
										? `~${totalFeesRaw.toFixed(6)}`
										: "$0"}
								</p>
								<p className="text-zinc-500 text-sm">
									{totalFeesRaw > 0 && pool
										? `${(
												Number(position?.tokensOwed0 || 0) /
												10 ** pool.token0.decimals
										  ).toFixed(6)} ${pool.token0.symbol} + ${(
												Number(position?.tokensOwed1 || 0) /
												10 ** pool.token1.decimals
										  ).toFixed(6)} ${pool.token1.symbol}`
										: "You have no earnings yet"}
								</p>
							</div>
						</div>

						{/* Small Links */}
						<div className="flex items-center justify-between px-2 pt-4">
							<button className="text-xs text-zinc-600 hover:text-white transition-colors">
								Don&apos;t recognize this position?
							</button>
							<button className="flex items-center gap-1.5 text-xs text-red-500/80 hover:text-red-500 transition-colors">
								<div className="w-4 h-4 rounded-sm bg-red-500/10 flex items-center justify-center">
									<span className="text-[10px]">🚩</span>
								</div>
								Report as spam
							</button>
						</div>
					</div>
				</div>
			</div>

			<LiquidityModals
				type={modalType}
				tokenId={selectedTokenId}
				isOpen={isModalOpen}
				onClose={closeModal}
				onSuccess={handleSuccess}
			/>
		</main>
	);
}
