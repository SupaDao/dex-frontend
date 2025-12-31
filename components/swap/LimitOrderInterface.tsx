"use client";

import React, { useState } from "react";
import { ArrowDown, Clock, X, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { type Token } from "@/lib/contracts/tokens";
import { useLimitOrder } from "@/hooks/useLimitOrder";
import { useAllowance } from "@/hooks/useAllowance";
import { useApprove } from "@/hooks/useApprove";
import { cn } from "@/lib/utils";
import { parseUnits, type Address } from "viem";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { MarketSelector } from "./MarketSelector";
import { ActiveBatchAuctionPanel } from "./ActiveBatchAuctionPanel";
import { MyOrdersTable } from "./MyOrdersTable";

interface LimitOrderProps {
	tokenIn: Token;
	tokenOut?: Token;
	setTokenIn: (t: Token) => void;
	setTokenOut: (t: Token) => void;
}

export default function LimitOrderInterface({
	tokenIn,
	tokenOut,
	setTokenIn,
	setTokenOut,
}: LimitOrderProps) {
	const { isConnected, address } = useAccount();
	const { open } = useAppKit();

	const [auctionAddress, setAuctionAddress] = useState<Address | null>(null);
	const [orderBookAddress, setOrderBookAddress] = useState<Address | null>(null);
	const [amountIn, setAmountIn] = useState("");
	const [limitPrice, setLimitPrice] = useState("");
	const [expiryHours, setExpiryHours] = useState(24);
	const [allowPartialFill, setAllowPartialFill] = useState(true);

	const {
		placeOrder,
		isLoading: isPending,
		error: orderError,
	} = useLimitOrder(orderBookAddress || undefined);

	// Token approval logic
	const { data: allowance, refetch: refetchAllowance } = useAllowance(
		tokenIn.address,
		address as Address,
		orderBookAddress || undefined
	);

	const { approve, isPending: isApproving } = useApprove();

	const needsApproval =
		isConnected &&
		amountIn &&
		allowance !== undefined &&
		parseUnits(amountIn, tokenIn.decimals) > (allowance as bigint);

	// Estimated Output Calculation
	const valIn = parseFloat(amountIn || "0");
	const valPrice = parseFloat(limitPrice || "0");
	const estimatedOutput =
		!isNaN(valIn) && !isNaN(valPrice)
			? (valIn * valPrice).toFixed(6)
			: "0.000000";

	const handlePlaceOrder = async () => {
		if (tokenOut && amountIn && limitPrice) {
			const hash = await placeOrder(
				tokenIn,
				tokenOut,
				amountIn,
				limitPrice,
				expiryHours,
				allowPartialFill
			);
			if (hash) {
				setAmountIn("");
				setLimitPrice("");
				refetchAllowance();
			}
		}
	};

	const handleApprove = () => {
		if (amountIn && orderBookAddress) {
			const amount = parseUnits(amountIn, tokenIn.decimals);
			approve(tokenIn.address, orderBookAddress, amount);
		}
	};

	const handleInput = (
		value: string,
		setter: React.Dispatch<React.SetStateAction<string>>
	) => {
		if (!value || /^\d*\.?\d*$/.test(value)) {
			setter(value);
		}
	};

	const isOrderBookConfigured =
		!!orderBookAddress &&
		orderBookAddress !== "0x0000000000000000000000000000000000000000";

	return (
		<div className="space-y-6">
			{/* Market Discovery Section */}
			<MarketSelector
				token0={tokenIn}
				token1={tokenOut}
				setToken0={setTokenIn}
				setToken1={setTokenOut}
				auctionAddress={auctionAddress}
				setAuctionAddress={setAuctionAddress}
				lobAddress={orderBookAddress}
				setLobAddress={setOrderBookAddress}
			/>

			{!isOrderBookConfigured && (
				<div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
					<div className="text-orange-500 text-sm">
						<strong>Order Book Contract Not Set</strong>
						<p className="mt-1 text-orange-400/80">
							Contact could not be resolved for this pair. Creating a new market will
							deploy one.
						</p>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Order Form */}
				<div className="space-y-4">
					<div className="bg-[#111] border border-white/5 rounded-3xl p-6 shadow-xl">
						<h3 className="text-white font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
							<Clock className="w-4 h-4 text-[var(--brand-lime)]" />
							Create Order
						</h3>

						<div className="space-y-4">
							{/* Input Section */}
							<div className="bg-[#181818] rounded-2xl p-4 border border-white/5 focus-within:border-[var(--brand-lime)]/30 transition-all">
								<div className="flex justify-between mb-2">
									<span className="text-zinc-500 text-xs font-black uppercase tracking-tighter">
										Amount In
									</span>
									{tokenIn && (
										<span className="text-zinc-600 text-xs font-mono">
											{tokenIn.symbol}
										</span>
									)}
								</div>
								<input
									type="text"
									inputMode="decimal"
									placeholder="0.00"
									value={amountIn}
									onChange={(e) => handleInput(e.target.value, setAmountIn)}
									className="bg-transparent text-3xl text-white font-black placeholder-zinc-800 focus:outline-none w-full font-mono"
								/>
							</div>

							{/* Price Input */}
							<div className="bg-[#181818] rounded-2xl p-4 border border-white/5 focus-within:border-[var(--brand-purple)]/30 transition-all">
								<div className="flex justify-between mb-2">
									<span className="text-zinc-500 text-xs font-black uppercase tracking-tighter">
										Limit Price
									</span>
									{tokenOut && (
										<span className="text-zinc-600 text-xs font-mono">
											{tokenOut.symbol} per {tokenIn.symbol}
										</span>
									)}
								</div>
								<input
									type="text"
									inputMode="decimal"
									placeholder="0.00"
									value={limitPrice}
									onChange={(e) => handleInput(e.target.value, setLimitPrice)}
									className="bg-transparent text-xl text-white font-black placeholder-zinc-800 focus:outline-none w-full font-mono"
								/>
							</div>

							{/* Output Section */}
							<div className="bg-[#181818]/50 rounded-2xl p-4 border border-white/5 opacity-80">
								<div className="flex justify-between mb-2">
									<span className="text-zinc-600 text-xs font-black uppercase tracking-tighter">
										Min. Receive (Est)
									</span>
								</div>
								<div className="text-2xl text-zinc-400 font-black font-mono">
									{estimatedOutput === "0.000000" ? "0.00" : estimatedOutput}
									<span className="text-xs ml-2 text-zinc-600 font-normal">
										{tokenOut?.symbol}
									</span>
								</div>
							</div>

							{/* Expiry & Partial Fill */}
							<div className="grid grid-cols-2 gap-4">
								<div className="bg-[#181818] rounded-2xl p-4 border border-white/5">
									<span className="text-zinc-500 text-[10px] font-black uppercase tracking-tighter block mb-2">
										Expiry
									</span>
									<select
										value={expiryHours}
										onChange={(e) => setExpiryHours(Number(e.target.value))}
										className="bg-transparent text-white font-bold text-sm w-full focus:outline-none cursor-pointer">
										<option
											value={1}
											className="bg-zinc-900">
											1 Hour
										</option>
										<option
											value={24}
											className="bg-zinc-900">
											24 Hours
										</option>
										<option
											value={168}
											className="bg-zinc-900">
											1 Week
										</option>
										<option
											value={720}
											className="bg-zinc-900">
											1 Month
										</option>
									</select>
								</div>
								<div className="bg-[#181818] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
									<span className="text-zinc-500 text-[10px] font-black uppercase tracking-tighter">
										Partial Fill
									</span>
									<button
										onClick={() => setAllowPartialFill(!allowPartialFill)}
										className={cn(
											"w-8 h-4 rounded-full transition-colors relative",
											allowPartialFill ? "bg-[var(--brand-lime)]" : "bg-zinc-700"
										)}>
										<div
											className={cn(
												"absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
												allowPartialFill ? "right-0.5" : "left-0.5"
											)}
										/>
									</button>
								</div>
							</div>

							<div className="pt-4">
								{!isConnected ? (
									<button
										onClick={() => open()}
										className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white font-black py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(157,92,255,0.3)] uppercase tracking-widest text-sm">
										Connect Wallet
									</button>
								) : needsApproval ? (
									<button
										onClick={handleApprove}
										disabled={isApproving}
										className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white font-black py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(157,92,255,0.2)] uppercase tracking-widest text-sm disabled:opacity-50">
										{isApproving ? "Approving..." : `Approve ${tokenIn.symbol}`}
									</button>
								) : (
									<button
										onClick={handlePlaceOrder}
										disabled={
											!amountIn ||
											!limitPrice ||
											!tokenOut ||
											isPending ||
											!isOrderBookConfigured
										}
										className={cn(
											"w-full font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm",
											isPending || !isOrderBookConfigured
												? "bg-zinc-800 text-zinc-600"
												: "bg-[var(--brand-lime)] hover:bg-lime-400 text-black shadow-[0_4px_20px_rgba(223,254,0,0.3)]"
										)}>
										{isPending ? "Processing..." : "Place Limit Order"}
									</button>
								)}
							</div>

							{orderError && (
								<p className="text-red-500 text-[10px] text-center mt-2 font-bold uppercase italic">
									{orderError.message.slice(0, 50)}...
								</p>
							)}

							<div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
								<div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
									<Info className="w-3 h-3 text-[var(--brand-lime)]" />
									Batch Auction Info
								</div>
								<p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
									Your order will be committed to the book and executed during the next
									settled batch auction if the clearing price meets your limit.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Batch Auction Panel */}
				<ActiveBatchAuctionPanel auctionAddress={auctionAddress} />
			</div>

			{/* My Orders Dashboard */}
			<div className="pt-6">
				<MyOrdersTable
					orderBookAddress={orderBookAddress || undefined}
					token0={tokenIn}
					token1={tokenOut}
				/>
			</div>
		</div>
	);
}

function Info({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}>
			<circle
				cx="12"
				cy="12"
				r="10"
			/>
			<path d="M12 16v-4" />
			<path d="M12 8h.01" />
		</svg>
	);
}
