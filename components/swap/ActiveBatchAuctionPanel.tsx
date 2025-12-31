"use client";

import React from "react";
import { Clock, Database, TrendingUp, Calendar } from "lucide-react";
import { type Address } from "viem";
import { useBatchAuction } from "@/hooks/useBatchAuction";
import { cn } from "@/lib/utils";

interface ActiveBatchAuctionPanelProps {
	auctionAddress: Address | null;
}

export function ActiveBatchAuctionPanel({
	auctionAddress,
}: ActiveBatchAuctionPanelProps) {
	const { currentBatchId, batchInfo, blocksRemaining, isLoading, error } =
		useBatchAuction(auctionAddress || undefined);

	if (!auctionAddress) {
		return (
			<div className="bg-[#111] border border-white/5 rounded-3xl p-8 text-center">
				<div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
					<Database className="w-8 h-8 text-zinc-600" />
				</div>
				<h3 className="text-zinc-400 font-bold">No Market Selected</h3>
				<p className="text-zinc-600 text-sm max-w-[200px] mx-auto mt-2">
					Select a token pair to view the active batch auction status.
				</p>
			</div>
		);
	}

	if (isLoading && !currentBatchId) {
		return (
			<div className="bg-[#111] border border-white/5 rounded-3xl p-8 flex items-center justify-center min-h-[200px]">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-lime)] border-t-transparent" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-red-400 text-sm">
				Failed to load auction data. Please try again later.
			</div>
		);
	}

	const stateColors = {
		Open: "text-[var(--brand-lime)] shadow-[0_0_12px_var(--brand-lime)]",
		Revealing: "text-amber-400 shadow-[0_0_12px_amber-400]",
		Settled: "text-blue-400 shadow-[0_0_12px_blue-400]",
	};

	return (
		<div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
			{/* Top Bar with Batch ID */}
			<div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5">
				<div className="flex items-center gap-2">
					<Database className="w-4 h-4 text-zinc-500" />
					<span className="text-xs font-bold text-zinc-400 tracking-wider">
						BATCH #{currentBatchId?.toString()}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"w-2 h-2 rounded-full animate-pulse",
							batchInfo?.state === "Open"
								? "bg-[var(--brand-lime)]"
								: batchInfo?.state === "Revealing"
								? "bg-amber-400"
								: "bg-blue-400"
						)}
					/>
					<span
						className={cn(
							"text-xs font-black uppercase tracking-widest",
							batchInfo?.state
								? stateColors[batchInfo.state].split(" shadow")[0]
								: "text-zinc-500"
						)}>
						{batchInfo?.state}
					</span>
				</div>
			</div>

			<div className="p-6">
				{/* Countdown / Status Section */}
				<div className="flex flex-col items-center justify-center py-6 text-center">
					{batchInfo?.state === "Open" ? (
						<>
							<div className="flex items-center gap-3 text-white mb-2">
								<Clock className="w-8 h-8 text-[var(--brand-lime)]" />
								<span className="text-5xl font-black font-mono">
									{blocksRemaining?.toString() || "0"}
								</span>
							</div>
							<p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
								Blocks Remaining
							</p>

							<div className="w-full max-w-xs h-1.5 bg-zinc-900 rounded-full mt-6 overflow-hidden border border-white/5">
								<div
									className="h-full bg-gradient-to-r from-[var(--brand-lime)] to-emerald-400 transition-all duration-1000"
									style={{
										width: `${Math.max(
											0,
											Math.min(100, (Number(blocksRemaining) / 10) * 100)
										)}%`,
									}}
								/>
							</div>
						</>
					) : (
						<div className="py-2">
							<div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 rotate-12 group-hover:rotate-0 transition-transform">
								{batchInfo?.state === "Revealing" ? (
									<TrendingUp className="w-10 h-10 text-amber-400" />
								) : (
									<Calendar className="w-10 h-10 text-blue-400" />
								)}
							</div>
							<h4 className="text-xl font-black text-white">
								{batchInfo?.state === "Revealing"
									? "Settlement Pending"
									: "Auction Settled"}
							</h4>
							<p className="text-zinc-500 text-sm mt-1">
								{batchInfo?.state === "Revealing"
									? "Calculating uniform clearing prices..."
									: "Next batch will start shortly."}
							</p>
						</div>
					)}
				</div>

				{/* Quick Stats Grid */}
				<div className="grid grid-cols-2 gap-4 mt-6">
					<div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
						<div className="text-xs text-zinc-500 font-bold mb-1 uppercase tracking-tighter">
							Clearing Price
						</div>
						<div className="text-lg font-black text-white font-mono">
							{batchInfo?.clearingPrice
								? (Number(batchInfo.clearingPrice) / 1e18).toFixed(4)
								: "---"}
						</div>
					</div>
					<div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
						<div className="text-xs text-zinc-500 font-bold mb-1 uppercase tracking-tighter">
							Total Volume
						</div>
						<div className="text-lg font-black text-white font-mono uppercase">
							{batchInfo?.totalVolume
								? (Number(batchInfo.totalVolume) / 1e18).toFixed(2)
								: "0.00"}
						</div>
					</div>
				</div>

				<div className="mt-8 pt-6 border-t border-white/5">
					<p className="text-xs text-zinc-600 leading-relaxed text-center italic">
						Orders are committed during the <b>Open</b> phase and settled at a single
						price during the <b>Settled</b> phase.
					</p>
				</div>
			</div>
		</div>
	);
}
