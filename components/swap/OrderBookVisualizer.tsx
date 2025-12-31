"use client";

import React from "react";
import { formatUnits } from "viem";
import { Token } from "@/lib/contracts/tokens";
import { useOrderBook } from "@/hooks/useOrderBook";
import { type Address } from "viem";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, BookOpen } from "lucide-react";

interface OrderBookVisualizerProps {
	orderBookAddress: Address;
	token0: Token;
	token1: Token;
	onPriceClick?: (price: string) => void;
}

export default function OrderBookVisualizer({
	orderBookAddress,
	token0,
	token1,
	onPriceClick,
}: OrderBookVisualizerProps) {
	const { buyOrders, sellOrders, bestBid, bestAsk, spreadPercent, isLoading } =
		useOrderBook(orderBookAddress, token0, token1);

	const formatPrice = (price: bigint) => {
		return parseFloat(formatUnits(price, 18)).toFixed(4);
	};

	const formatAmount = (amount: bigint, decimals: number) => {
		const val = parseFloat(formatUnits(amount, decimals));
		if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
		if (val >= 1000) return (val / 1000).toFixed(1) + "K";
		return val.toFixed(2);
	};

	const maxDepth = Math.max(
		Number(
			buyOrders.length > 0 ? buyOrders[buyOrders.length - 1].cumulativeAmount : 0n
		),
		Number(
			sellOrders.length > 0
				? sellOrders[sellOrders.length - 1].cumulativeAmount
				: 0n
		)
	);

	if (isLoading && buyOrders.length === 0) {
		return (
			<div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-lime)] border-t-transparent mb-4" />
				<p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
					Analyzing Demand...
				</p>
			</div>
		);
	}

	return (
		<div className="bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col h-full">
			{/* Header */}
			<div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BookOpen className="w-4 h-4 text-zinc-500" />
					<h3 className="text-white font-black uppercase tracking-widest text-xs">
						Batch Book
					</h3>
				</div>
				{spreadPercent !== null && (
					<div className="text-[10px] bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-bold uppercase tracking-tighter">
						Spread:{" "}
						<span className="text-[var(--brand-lime)]">
							{spreadPercent.toFixed(2)}%
						</span>
					</div>
				)}
			</div>

			{/* Column Headers */}
			<div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5">
				<div className="bg-[#0a0a0a] px-4 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-tighter text-left">
					Buy Volume
				</div>
				<div className="bg-[#0a0a0a] px-4 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-tighter text-right">
					Sell Volume
				</div>
			</div>

			<div className="flex-1 grid grid-cols-2 overflow-hidden min-h-[300px]">
				{/* Buy Side */}
				<div className="flex flex-col border-r border-white/5">
					<div className="flex-1 overflow-y-auto custom-scrollbar">
						{buyOrders.length > 0 ? (
							buyOrders.slice(0, 20).map((level, idx) => (
								<button
									key={idx}
									onClick={() => onPriceClick?.(formatPrice(level.price))}
									className="w-full px-4 py-2.5 hover:bg-white/[0.02] transition-colors relative group text-left">
									<div
										className="absolute inset-y-0.5 right-0 bg-green-500/10 border-r-2 border-green-500/30 transition-all"
										style={{
											width: `${(Number(level.cumulativeAmount) / maxDepth) * 100}%`,
										}}
									/>
									<div className="relative flex justify-between items-center">
										<span className="text-green-400 font-mono font-bold text-xs">
											{formatPrice(level.price)}
										</span>
										<span className="text-zinc-400 font-mono text-xs">
											{formatAmount(level.amount, token0.decimals)}
										</span>
									</div>
								</button>
							))
						) : (
							<div className="p-8 text-center text-zinc-700 text-[10px] uppercase font-bold italic">
								No Bids
							</div>
						)}
					</div>
				</div>

				{/* Sell Side */}
				<div className="flex flex-col">
					<div className="flex-1 overflow-y-auto custom-scrollbar">
						{sellOrders.length > 0 ? (
							sellOrders.slice(0, 20).map((level, idx) => (
								<button
									key={idx}
									onClick={() => onPriceClick?.(formatPrice(level.price))}
									className="w-full px-4 py-2.5 hover:bg-white/[0.02] transition-colors relative group text-right">
									<div
										className="absolute inset-y-0.5 left-0 bg-red-500/10 border-l-2 border-red-500/30 transition-all"
										style={{
											width: `${(Number(level.cumulativeAmount) / maxDepth) * 100}%`,
										}}
									/>
									<div className="relative flex justify-between items-center">
										<span className="text-zinc-400 font-mono text-xs">
											{formatAmount(level.amount, token0.decimals)}
										</span>
										<span className="text-red-400 font-mono font-bold text-xs">
											{formatPrice(level.price)}
										</span>
									</div>
								</button>
							))
						) : (
							<div className="p-8 text-center text-zinc-700 text-[10px] uppercase font-bold italic">
								No Asks
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Market Stats Footer */}
			<div className="px-4 py-3 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
				<div className="flex flex-col">
					<span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
						Best Bid
					</span>
					<span className="text-white font-mono font-bold text-sm">
						{bestBid ? formatPrice(bestBid) : "---"}
					</span>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
						Best Ask
					</span>
					<span className="text-white font-mono font-bold text-sm">
						{bestAsk ? formatPrice(bestAsk) : "---"}
					</span>
				</div>
			</div>
		</div>
	);
}
