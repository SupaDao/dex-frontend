"use client";

import React from "react";
import { motion } from "framer-motion";
import { usePositions } from "@/hooks/usePositions";
import { formatUnits } from "viem";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PositionsList() {
	const { positions, isLoading } = usePositions();

	if (isLoading) {
		return <div className="text-center py-10">Loading positions...</div>;
	}

	if (positions.length === 0) {
		return (
			<div className="glass-panel p-8 rounded-3xl text-center">
				<h3 className="text-xl font-bold text-white mb-2">No Active Positions</h3>
				<p className="text-zinc-400 mb-6">
					You don't have any open liquidity positions yet.
				</p>
				<Link
					href="/pools"
					className="bg-[var(--brand-lime)] text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform inline-block">
					Explore Pools
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold text-white">Your Liquidity Positions</h2>
			{positions.map((pos) => (
				<motion.div
					key={pos!.tokenId.toString()}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-panel p-6 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all cursor-pointer">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-lg font-bold text-white">
								Position #{pos!.tokenId.toString()}
							</span>
							<span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
								Active
							</span>
						</div>
						<div className="text-sm text-zinc-400">
							Pool:{" "}
							<span className="text-zinc-300 font-mono">
								{pos!.pool.slice(0, 6)}...{pos!.pool.slice(-4)}
							</span>
						</div>
						<div className="text-sm text-zinc-400">
							Liquidity:{" "}
							<span className="text-white font-medium">
								{formatUnits(pos!.liquidity, 18)}
							</span>
						</div>
					</div>

					<div className="text-right">
						<div className="text-xs text-zinc-500 mb-1">Range</div>
						<div className="font-mono text-sm text-zinc-300">
							{pos!.tickLower} &harr; {pos!.tickUpper}
						</div>
					</div>
				</motion.div>
			))}
		</div>
	);
}
