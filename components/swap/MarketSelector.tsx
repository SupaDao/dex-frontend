"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Plus, Info, Search } from "lucide-react";
import { type Address } from "viem";
import { Token } from "@/lib/contracts/tokens";
import { TokenSelector } from "./TokenSelector";
import { useFactory } from "@/hooks/useFactory";
import { cn } from "@/lib/utils";

interface MarketSelectorProps {
	token0: Token | undefined;
	token1: Token | undefined;
	setToken0: (token: Token) => void;
	setToken1: (token: Token) => void;
	auctionAddress: Address | null;
	setAuctionAddress: (address: Address | null) => void;
	lobAddress: Address | null;
	setLobAddress: (address: Address | null) => void;
}

export function MarketSelector({
	token0,
	token1,
	setToken0,
	setToken1,
	auctionAddress,
	setAuctionAddress,
	lobAddress,
	setLobAddress,
}: MarketSelectorProps) {
	const [isToken0SelectorOpen, setIsToken0SelectorOpen] = useState(false);
	const [isToken1SelectorOpen, setIsToken1SelectorOpen] = useState(false);
	const {
		getAuctionAddress,
		getLimitOrderBookAddress,
		createAuction,
		createLimitOrderBook,
		isLoading,
		error,
	} = useFactory();

	useEffect(() => {
		if (token0 && token1) {
			// Fetch Auction Address
			getAuctionAddress(token0.address, token1.address).then((addr) => {
				setAuctionAddress(addr);
			});

			// Fetch LOB Address
			getLimitOrderBookAddress(token0.address, token1.address).then((addr) => {
				setLobAddress(addr);
			});
		}
	}, [
		token0,
		token1,
		getAuctionAddress,
		setAuctionAddress,
		getLimitOrderBookAddress,
		setLobAddress,
	]);

	const handleCreateMarket = async () => {
		if (!token0 || !token1) return;

		// Create Auction if missing
		if (!auctionAddress) {
			const addr = await createAuction(token0.address, token1.address);
			if (addr) setAuctionAddress(addr);
		}

		// Create LOB if missing
		if (!lobAddress) {
			const addr = await createLimitOrderBook(token0.address, token1.address);
			if (addr) setLobAddress(addr);
		}
	};

	return (
		<div className="w-full bg-[#111] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
			{/* Gradient Background Decoration */}
			<div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-lime)]/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-[var(--brand-lime)]/10 transition-colors" />

			<div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
				{/* Token 0 Selector */}
				<button
					onClick={() => setIsToken0SelectorOpen(true)}
					className="flex-1 w-full bg-[#1A1A1A] hover:bg-[#222] border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all group/btn">
					<div className="flex items-center gap-3">
						{token0 ? (
							<>
								<div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover/btn:border-[var(--brand-lime)]/50 transition-colors overflow-hidden">
									{token0.logoURI ? (
										<img
											src={token0.logoURI}
											alt={token0.symbol}
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="font-bold text-zinc-400">{token0.symbol[0]}</span>
									)}
								</div>
								<div className="text-left">
									<div className="text-sm text-zinc-500 font-medium">Base Token</div>
									<div className="text-lg font-bold text-white group-hover/btn:text-[var(--brand-lime)] transition-colors">
										{token0.symbol}
									</div>
								</div>
							</>
						) : (
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-zinc-900 border border-dashed border-white/20 flex items-center justify-center">
									<Search className="w-5 h-5 text-zinc-600" />
								</div>
								<span className="text-zinc-400 font-bold">Select Token</span>
							</div>
						)}
					</div>
					<ChevronDown className="w-5 h-5 text-zinc-500 group-hover/btn:text-[var(--brand-lime)] transition-colors" />
				</button>

				<div className="h-8 w-px bg-white/5 hidden md:block" />
				<div className="w-full h-px bg-white/5 block md:hidden" />

				{/* Token 1 Selector */}
				<button
					onClick={() => setIsToken1SelectorOpen(true)}
					className="flex-1 w-full bg-[#1A1A1A] hover:bg-[#222] border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all group/btn">
					<div className="flex items-center gap-3">
						{token1 ? (
							<>
								<div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover/btn:border-[var(--brand-purple)]/50 transition-colors overflow-hidden">
									{token1.logoURI ? (
										<img
											src={token1.logoURI}
											alt={token1.symbol}
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="font-bold text-zinc-400">{token1.symbol[0]}</span>
									)}
								</div>
								<div className="text-left">
									<div className="text-sm text-zinc-500 font-medium">Quote Token</div>
									<div className="text-lg font-bold text-white group-hover/btn:text-[var(--brand-purple)] transition-colors">
										{token1.symbol}
									</div>
								</div>
							</>
						) : (
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-zinc-900 border border-dashed border-white/20 flex items-center justify-center">
									<Search className="w-5 h-5 text-zinc-600" />
								</div>
								<span className="text-zinc-400 font-bold">Select Token</span>
							</div>
						)}
					</div>
					<ChevronDown className="w-5 h-5 text-zinc-500 group-hover/btn:text-[var(--brand-purple)] transition-colors" />
				</button>
			</div>

			{/* Market Status Information */}
			<div className="mt-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"w-2 h-2 rounded-full",
							auctionAddress
								? "bg-[var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]"
								: "bg-zinc-600"
						)}
					/>
					<span className="text-sm font-medium text-zinc-400">
						{auctionAddress ? "Market Active" : "Market Not Discovered"}
					</span>
				</div>

				{token0 && token1 && !auctionAddress && !isLoading && (
					<button
						onClick={handleCreateMarket}
						className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all">
						<Plus className="w-4 h-4" />
						Create Auction Market
					</button>
				)}

				{isLoading && (
					<div className="flex items-center gap-2 text-zinc-500 text-sm italic">
						<div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--brand-lime)] border-t-transparent" />
						Syncing market details...
					</div>
				)}

				{auctionAddress && (
					<div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
						<Info className="w-3.5 h-3.5" />
						<span className="font-mono">
							{auctionAddress.slice(0, 6)}...{auctionAddress.slice(-4)}
						</span>
					</div>
				)}
			</div>

			<TokenSelector
				isOpen={isToken0SelectorOpen}
				onClose={() => setIsToken0SelectorOpen(false)}
				onSelect={(t) => setToken0(t)}
				selectedToken={token0}
			/>
			<TokenSelector
				isOpen={isToken1SelectorOpen}
				onClose={() => setIsToken1SelectorOpen(false)}
				onSelect={(t) => setToken1(t)}
				selectedToken={token1}
			/>
		</div>
	);
}
