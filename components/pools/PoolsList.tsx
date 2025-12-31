"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePools } from "@/hooks/usePools";
import { usePositions } from "@/hooks/usePositions";
import PositionCard from "./PositionCard";
import { Plus, ArrowRight, LayoutGrid, Info, ChevronDown } from "lucide-react";
import { type Address } from "viem";
import { cn } from "@/lib/utils";
import { getDisplaySymbol } from "@/lib/contracts/tokens";
import LiquidityModals, { LiquidityModalType } from "./LiquidityModals";

import { usePoolInfo } from "@/hooks/usePoolInfo";
import { useTokenDetails } from "@/hooks/useTokenDetails";

function PoolHeader({
	poolAddress,
	fallbackPool,
}: {
	poolAddress: Address;
	fallbackPool?: any;
}) {
	const { token0: t0Addr, token1: t1Addr } = usePoolInfo(
		!fallbackPool ? poolAddress : undefined
	);

	const t0Details = useTokenDetails(fallbackPool?.token0.address || t0Addr);
	const t1Details = useTokenDetails(fallbackPool?.token1.address || t1Addr);

	const s0 =
		getDisplaySymbol(
			fallbackPool?.token0.symbol ||
				t0Details.symbol ||
				(t0Addr ? t0Addr.slice(0, 6) : "..."),
			fallbackPool?.token0.address || t0Addr
		) || "...";
	const s1 =
		getDisplaySymbol(
			fallbackPool?.token1.symbol ||
				t1Details.symbol ||
				(t1Addr ? t1Addr.slice(0, 6) : "..."),
			fallbackPool?.token1.address || t1Addr
		) || "...";

	return (
		<h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
			{s0} / {s1}
		</h3>
	);
}

export default function PoolsList() {
	const { pools, refetch: refetchPools } = usePools();
	const {
		positions,
		isLoading: isPositionsLoading,
		refetch: refetchPositions,
	} = usePositions();
	const [statusFilter, setStatusFilter] = React.useState<
		"all" | "inRange" | "outOfRange" | "closed"
	>("all");

	// Modal State
	const [modalType, setModalType] = React.useState<LiquidityModalType>(null);
	const [selectedTokenId, setSelectedTokenId] = React.useState<
		string | undefined
	>();
	const [isModalOpen, setIsModalOpen] = React.useState(false);

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
	}, [refetchPositions, refetchPools]);

	// Filter and Group positions
	const groupedPositions = React.useMemo(() => {
		const filtered = positions.filter((pos: any) => {
			if (statusFilter === "all") return true;

			const pool = pools.find(
				(p) => p.address.toLowerCase() === pos.pool.toLowerCase()
			);
			const currentTick = pool?.slot0?.tick;
			const inRange =
				currentTick !== undefined &&
				currentTick >= pos.tickLower &&
				currentTick < pos.tickUpper;
			const isActive = BigInt(pos.liquidity) > 0n;

			if (statusFilter === "closed") return !isActive;
			if (statusFilter === "inRange") return isActive && inRange;
			if (statusFilter === "outOfRange") return isActive && !inRange;
			return true;
		});

		// Group by pool
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const groups: Record<string, { pool: unknown; positions: any[] }> = {};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		filtered.forEach((pos: any) => {
			if (!groups[pos.pool]) {
				const poolInfo = pools.find(
					(p) => p.address.toLowerCase() === pos.pool.toLowerCase()
				);
				groups[pos.pool] = { pool: poolInfo, positions: [] };
			}
			groups[pos.pool].positions.push(pos);
		});
		return Object.values(groups);
	}, [positions, pools, statusFilter]);

	return (
		<div className="w-full max-w-[1200px] mx-auto pb-20 px-4">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
				{/* Left Column: Main Content */}
				<div className="space-y-8">
					{/* Rewards Hero Section */}
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="relative overflow-hidden rounded-[32px] border border-white/5 bg-[#121212] p-8 min-h-[200px] flex flex-col justify-between">
						{/* Subtle Grid Pattern Background */}
						<div
							className="absolute inset-0 opacity-10"
							style={{
								backgroundImage: "radial-gradient(#ffffff 0.5px, transparent 0.5px)",
								backgroundSize: "20px 20px",
							}}
						/>

						<div className="relative z-10 flex justify-between items-start">
							<div>
								<div className="flex items-center gap-2 text-5xl font-medium text-white mb-2">
									0 $SPC
									<div className="w-6 h-6 rounded-full bg-[var(--brand-lime)]/20 flex items-center justify-center">
										<div className="w-3 h-3 rounded-full bg-[var(--brand-lime)]" />
									</div>
								</div>
								<div className="flex items-center gap-1.5 text-zinc-500 text-sm">
									Rewards earned
									<Info className="w-3.5 h-3.5" />
								</div>
							</div>
							<button className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors">
								Collect rewards
							</button>
						</div>

						<div className="relative z-10 mt-8">
							<Link
								href="#"
								className="flex items-center gap-2 text-white font-medium group text-sm">
								Find pools with $SPC rewards
								<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
							</Link>
							<p className="text-zinc-500 text-sm mt-1">
								Eligible pools have token rewards so you can earn more
							</p>
						</div>
					</motion.div>

					<div className="space-y-6 pt-8">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h2 className="text-2xl font-medium text-white">Your positions</h2>
								<p className="text-zinc-500 text-sm">
									These are your active liquidity positions. You can have multiple
									positions in the same pool.
								</p>
							</div>
						</div>

						{/* Filters / Actions Bar */}
						<div className="flex flex-wrap items-center gap-2">
							<Link
								href="/pools/add"
								className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
								<Plus className="w-4 h-4" />
								<span>New</span>
								<ChevronDown className="w-3.5 h-3.5 opacity-50" />
							</Link>

							{/* Status Filter */}
							<div className="relative group/filter">
								<button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 font-medium hover:bg-zinc-900 hover:text-white transition-all text-sm uppercase tracking-wider">
									{statusFilter === "all"
										? "All Status"
										: statusFilter.replace(/([A-Z])/g, " $1").trim()}
									<ChevronDown className="w-3.5 h-3.5" />
								</button>
								<div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-white/5 rounded-2xl p-1 shadow-2xl opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-all z-50">
									{(["all", "inRange", "outOfRange", "closed"] as const).map((s) => (
										<button
											key={s}
											onClick={() => setStatusFilter(s)}
											className={cn(
												"w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors",
												statusFilter === s
													? "bg-white/10 text-white"
													: "text-zinc-500 hover:text-white hover:bg-white/5"
											)}>
											{s === "all" ? "All Status" : s.replace(/([A-Z])/g, " $1").trim()}
										</button>
									))}
								</div>
							</div>

							<button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 font-medium hover:bg-zinc-900 hover:text-white transition-all text-sm uppercase tracking-wider">
								Protocol
								<ChevronDown className="w-3.5 h-3.5" />
							</button>

							<button className="w-9 h-9 flex items-center justify-center rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
								<LayoutGrid className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-12">
							{isPositionsLoading ? (
								<div className="h-32 rounded-3xl bg-white/5 animate-pulse" />
							) : groupedPositions.length > 0 ? (
								groupedPositions.map((group) => (
									<div
										key={group.pool?.address || Math.random()}
										className="space-y-4">
										{/* Pool Header for Group */}
										<div className="flex items-center justify-between px-1">
											<PoolHeader
												poolAddress={
													group.pool?.address || (group.positions[0]?.pool as Address)
												}
												fallbackPool={group.pool as any}
											/>
											<span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
												{group.positions.length} Positions
											</span>
										</div>
										<div className="grid grid-cols-1 gap-4">
											{group.positions.map((pos) => (
												<PositionCard
													key={pos.tokenId.toString()}
													position={pos}
													onIncrease={() => openModal("increase", pos.tokenId.toString())}
													onRemove={() => openModal("remove", pos.tokenId.toString())}
												/>
											))}
										</div>
									</div>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
									<p className="text-zinc-500 mb-6">
										No positions found for the selected status.
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Banner / Info */}
					<div className="bg-white/5 rounded-2xl p-4 flex items-start gap-3 border border-white/5">
						<Info className="w-5 h-5 text-zinc-500 mt-0.5" />
						<div className="flex-1">
							<p className="text-sm font-medium text-white">
								Looking for your closed positions?
							</p>
							<p className="text-sm text-zinc-500">
								You can see them by using the filter at the top of the page.
							</p>
						</div>
						<button className="text-zinc-500 hover:text-white">
							<Plus className="w-4 h-4 rotate-45" />
						</button>
					</div>
				</div>

				{/* Right Column: Sidebar */}
				<aside className="space-y-10">
					{/* Pools with Rewards */}
					<section className="space-y-5">
						<h3 className="text-lg font-medium text-white px-1">
							Pools with rewards
						</h3>
						<div className="space-y-3">
							{[
								{
									pair: "USDe / USDT",
									apr: "1.56% APR",
									reward: "+7.37%",
									v: "v1",
									fee: "0.0045%",
								},
								{
									pair: "USDC / USDT",
									apr: "1.13% APR",
									reward: "+5.07%",
									v: "v1",
									fee: "0.0008%",
								},
								{
									pair: "sUSDe / USDT",
									apr: "4.02% APR",
									reward: "+4.85%",
									v: "v1",
									fee: "0.008%",
								},
							].map((item, i) => (
								<div
									key={i}
									className="group p-4 rounded-3xl border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer">
									<div className="flex items-center gap-3">
										<div className="flex -space-x-2">
											<div className="w-8 h-8 rounded-full bg-blue-500/20 border border-zinc-950 flex items-center justify-center text-[10px] font-bold">
												{item.pair.split(" / ")[0].slice(0, 1)}
											</div>
											<div className="w-8 h-8 rounded-full bg-pink-500/20 border border-zinc-950 flex items-center justify-center text-[10px] font-bold">
												{item.pair.split(" / ")[1].slice(0, 1)}
											</div>
										</div>
										<div className="flex-1">
											<div className="text-sm font-medium text-white">{item.pair}</div>
											<div className="flex items-center gap-1.5 mt-0.5">
												<span className="text-[10px] text-zinc-500 font-mono">
													{item.v}
												</span>
												<span className="text-[10px] text-zinc-500 font-mono">
													{item.fee}
												</span>
											</div>
										</div>
										<div className="text-right">
											<div className="text-xs font-medium text-white">{item.apr}</div>
											<div className="text-[10px] font-medium text-pink-500 flex items-center justify-end gap-1">
												{item.reward}
												<div className="w-2.5 h-2.5 rounded-full bg-pink-500/20 flex items-center justify-center">
													<div className="w-1 h-1 rounded-full bg-pink-500" />
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
							<Link
								href="#"
								className="flex items-center gap-2 text-zinc-500 text-sm px-1 hover:text-white transition-colors group">
								Explore Unichain pools
								<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
							</Link>
						</div>
					</section>

					{/* Top Pools by TVL */}
					<section className="space-y-5">
						<h3 className="text-lg font-medium text-white px-1">Top pools by TVL</h3>
						<div className="space-y-3">
							{[
								{ pair: "WISE / ETH", apr: "0.02% APR", v: "v2", fee: "0.3%" },
								{ pair: "ETH / USDT", apr: "61.06% APR", v: "v3", fee: "0.3%" },
								{ pair: "ETH / USDC", apr: "27.45% APR", v: "v3", fee: "0.05%" },
							].map((item, i) => (
								<div
									key={i}
									className="group p-4 rounded-3xl border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer">
									<div className="flex items-center gap-3">
										<div className="flex -space-x-2">
											<div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-950 flex items-center justify-center text-[10px] font-bold font-mono">
												{item.pair.split(" / ")[0].slice(0, 1)}
											</div>
											<div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-950 flex items-center justify-center text-[10px] font-bold font-mono">
												{item.pair.split(" / ")[1].slice(0, 1)}
											</div>
										</div>
										<div className="flex-1">
											<div className="text-sm font-medium text-white">{item.pair}</div>
											<div className="flex items-center gap-1.5 mt-0.5">
												<span className="text-[10px] text-zinc-500 font-mono">
													{item.v}
												</span>
												<span className="text-[10px] text-zinc-500 font-mono">
													{item.fee}
												</span>
											</div>
										</div>
										<div className="text-right">
											<div className="text-xs font-medium text-white">{item.apr}</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</aside>
			</div>

			<LiquidityModals
				type={modalType}
				tokenId={selectedTokenId}
				isOpen={isModalOpen}
				onClose={closeModal}
				onSuccess={handleSuccess}
			/>
		</div>
	);
}
