"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Settings, ArrowDownUp } from "lucide-react";
import { useConnection } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits, parseUnits } from "viem";

import { TokenSelector } from "./TokenSelector";
import SettingsModal from "./SettingsModal";
import LimitOrderInterface from "./LimitOrderInterface";
import { TOKENS, Token } from "@/lib/contracts/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { usePoolQuote } from "@/hooks/usePoolQuote";
import { useSwap } from "@/hooks/useSwap";
import { useAllowance } from "@/hooks/useAllowance";
import { useApprove } from "@/hooks/useApprove";
import { useSwapSimulation } from "@/hooks/useSwapSimulation";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SwapInterface() {
	const { address, isConnected } = useConnection();
	const { open } = useAppKit();

	// Tabs: 'swap' | 'limit'
	const [activeTab, setActiveTab] = useState<"swap" | "limit">("swap");

	// Settings State
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [slippage, setSlippage] = useState(0.5); // Default 0.5% manually
	const [isAutoSlippage, setIsAutoSlippage] = useState(true); // Auto by default
	const [deadline, setDeadline] = useState(20); // Default 20 mins

	const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]); // ETH (Native)
	const [tokenOut, setTokenOut] = useState<Token | undefined>(undefined); // DAI (Index shifted by 1)

	// Swap Specific State
	const [amountIn, setAmountIn] = useState("");
	const [isTokenInSelectorOpen, setIsTokenInSelectorOpen] = useState(false);
	const [isTokenOutSelectorOpen, setIsTokenOutSelectorOpen] = useState(false);

	const isWrappingVal = tokenIn.symbol === "ETH" && tokenOut?.symbol === "WETH";
	const isUnwrappingVal =
		tokenIn.symbol === "WETH" && tokenOut?.symbol === "ETH";
	const isWrapAction = isWrappingVal || isUnwrappingVal;

	// Fetch balances
	const { data: balanceIn, refetch: refetchBalanceIn } = useTokenBalance(
		tokenIn.address,
		address
	);
	const { data: balanceOut, refetch: refetchBalanceOut } = useTokenBalance(
		tokenOut?.address,
		address
	);

	// Fetch quote
	const {
		data: poolSlot0,
		fee: poolFee,
		notFound: poolNotFound,
	} = usePoolQuote(tokenIn.address, tokenOut?.address);

	const amountInParsed = amountIn ? parseUnits(amountIn, tokenIn.decimals) : 0n;

	const { data: allowance, refetch: refetchAllowance } = useAllowance(
		tokenIn.address,
		address,
		CONTRACTS.router
	);

	const needsApproval =
		isConnected &&
		!isWrapAction &&
		amountInParsed > 0n &&
		allowance !== undefined &&
		allowance < amountInParsed;

	const {
		approve,
		isPending: isApproving,
		isSuccess: isApproved,
		error: approveError,
	} = useApprove();

	useEffect(() => {
		if (isApproved) {
			refetchAllowance();
			toast.success(`Approved ${tokenIn.symbol}`);
		}
	}, [isApproved, refetchAllowance, tokenIn.symbol]);

	useEffect(() => {
		if (approveError) {
			toast.error(`Approval failed: ${approveError.message}`);
		}
	}, [approveError]);

	const {
		write: swap,
		wrap,
		unwrap,
		isPending: isSwapping,
		isConfirming: isConfirmingSwap,
		error: swapError,
		isSuccess: isSwapSuccess,
	} = useSwap();

	useEffect(() => {
		if (swapError) {
			console.error("Swap error:", swapError);
			// Extract short message if possible, or show generic
			const message =
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(swapError as any).shortMessage ||
				swapError.message ||
				"Transaction failed";
			toast.error(`Swap failed: ${message}`);
		}
	}, [swapError]);

	useEffect(() => {
		if (isSwapSuccess) {
			toast.success("Transaction confirmed!");
			setAmountIn("");
			refetchBalanceIn();
			refetchBalanceOut();
			refetchAllowance();
		}
	}, [isSwapSuccess, refetchBalanceIn, refetchBalanceOut, refetchAllowance]);

	const isPending = isApproving || isSwapping || isConfirmingSwap;

	const handleAction = async () => {
		if (!isConnected) {
			open();
			return;
		}

		if (isWrappingVal) {
			wrap(amountIn);
			return;
		}

		if (isUnwrappingVal) {
			unwrap(amountIn);
			return;
		}

		if (needsApproval) {
			approve(tokenIn.address, CONTRACTS.router, amountInParsed);
		} else {
			if (!poolFee) return;

			// Calculate minimum amount out based on slippage
			// slippage is in %, e.g. 0.5
			// multiplier = 1 - (slippage / 100)
			// we need to apply this to the amountOut string, then parse, or parse then apply.
			// amountOut string is derived from price * amountIn.
			// Let's parse amountOut to BigInt first.

			if (!amountOut) return;

			const amountOutWei = parseUnits(amountOut, tokenOut!.decimals);
			const slippageBasisPoints = BigInt(Math.floor(activeSlippage * 100)); // 0.5% -> 50, 1% -> 100
			const amountOutMin =
				(amountOutWei * (10000n - slippageBasisPoints)) / 10000n;
			// Convert back to string format for the hook which expects string (though hook immediately parses it again, inefficient but consistent with current signature)
			// Wait, current hook: uses parseUnits(amountOutMin, tokenOut.decimals).
			// So we should pass the string representation of amountOutMin?
			// OR refactor hook to take bigint. Refactoring hook is cleaner but let's stick to fixing the call first to minimize diffs if hook expects string.
			// Actually, hook does: `const amountOutMinWei = ... parseUnits(...)`.
			// Re-formatting to string to be re-parsed is prone to precision loss if not careful.
			// Let's format exactly.

			const amountOutMinString = formatUnits(amountOutMin, tokenOut!.decimals);

			swap?.(
				tokenIn,
				tokenOut!,
				amountIn,
				amountOutMinString,
				address!,
				BigInt(deadline * 60 + Math.floor(Date.now() / 1000)),
				poolFee
			);
		}
	};

	// Calculate price from slot0 (sqrtPriceX96)
	const [price, setPrice] = useState<number | null>(null);

	useEffect(() => {
		if (isWrapAction) {
			setPrice(1.0);
			return;
		}

		if (poolSlot0 && tokenOut) {
			const sqrtPriceX96 = Number(poolSlot0[0]);
			const rawPrice = (sqrtPriceX96 / 2 ** 96) ** 2;
			const isTokenInToken0 =
				tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
			const adjustedPrice = isTokenInToken0
				? rawPrice * 10 ** (tokenIn.decimals - tokenOut.decimals)
				: (1 / rawPrice) * 10 ** (tokenIn.decimals - tokenOut.decimals);

			setPrice(adjustedPrice);
		} else {
			setPrice(null);
		}
	}, [poolSlot0, tokenIn, tokenOut, isWrapAction]);

	const amountOut =
		price && amountIn && !isNaN(parseFloat(amountIn))
			? (parseFloat(amountIn) * price).toFixed(6)
			: "";

	// --- Simulation & Impact ---
	const {
		amountOutReal,
		isLoading: isLoadingSimulation,
		isError: isSimulationError,
		error: simulationError,
	} = useSwapSimulation(
		tokenIn,
		tokenOut,
		amountIn,
		poolFee || 3000,
		address || "0x0000000000000000000000000000000000000000"
	);

	const isSimulationErrorAdjusted = isSimulationError && !isWrapAction;

	const amountOutRealFormatted =
		amountOutReal && tokenOut
			? parseFloat(formatUnits(amountOutReal, tokenOut.decimals))
			: 0;

	// Calculate Price Impact
	// Impact = (Expected(Spot) - Real) / Expected(Spot) * 100
	let priceImpact = 0;
	if (isWrapAction) {
		priceImpact = 0;
	} else {
		const amountOutSpot = parseFloat(amountOut || "0");
		if (amountOutSpot > 0 && amountOutRealFormatted > 0) {
			priceImpact =
				((amountOutSpot - amountOutRealFormatted) / amountOutSpot) * 100;
		}
	}
	if (priceImpact < 0) priceImpact = 0; // Positive impact or precision error

	// Calculate Auto Slippage
	const autoSlippage = useMemo(() => {
		if (isWrapAction) return 0.5;
		if (isSimulationErrorAdjusted || isLoadingSimulation) return 0.5; // Fallback
		// Buffer of 0.5% on top of impact
		let val = priceImpact + 0.5;
		if (val < 0.5) val = 0.5; // Min 0.5%
		if (val > 30) val = 30; // Max 30%
		return parseFloat(val.toFixed(2));
	}, [
		priceImpact,
		isSimulationErrorAdjusted,
		isLoadingSimulation,
		isWrapAction,
	]);

	const activeSlippage = isAutoSlippage ? autoSlippage : slippage;

	// If simulation fails (likely due to B->A issue or other reverts), we should warn
	useEffect(() => {
		if (isSimulationErrorAdjusted && amountIn) {
			console.error("Sim error", simulationError);
		}
	}, [isSimulationErrorAdjusted, simulationError, amountIn]);

	const isSafetyLocked = priceImpact > 30;

	// Calculate Min Received (Amount user is guaranteed to get)
	const minReceived = useMemo(() => {
		if (!amountOut || !tokenOut) return "0";
		try {
			const amountOutWei = parseUnits(amountOut, tokenOut.decimals);
			const slippageBasisPoints = BigInt(Math.floor(activeSlippage * 100));
			const minWei = (amountOutWei * (10000n - slippageBasisPoints)) / 10000n;
			const formatted = formatUnits(minWei, tokenOut.decimals);
			// Format to meaningful display (e.g. 4 decimals)
			return parseFloat(formatted).toFixed(4);
		} catch {
			return "0";
		}
	}, [amountOut, tokenOut, activeSlippage]);

	const handleSwitchTokens = () => {
		setTokenIn(tokenOut!);
		setTokenOut(tokenIn);
		setAmountIn("");
	};

	const formattedBalanceIn = balanceIn
		? parseFloat(formatUnits(balanceIn.value, balanceIn.decimals)).toFixed(4)
		: "0";

	const formattedBalanceOut = balanceOut
		? parseFloat(formatUnits(balanceOut.value, balanceOut.decimals)).toFixed(4)
		: "0";

	return (
		<div className="w-full max-w-[640px] mx-auto pt-8 px-4 relative z-10">
			{/* Header & Tabs */}
			<div className="flex items-center justify-between mb-4 px-2">
				<div className="flex bg-[#111] p-1 rounded-xl border border-white/5">
					<button
						onClick={() => setActiveTab("swap")}
						className={cn(
							"px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
							activeTab === "swap"
								? "bg-white/10 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						)}>
						Swap
					</button>
					<button
						onClick={() => setActiveTab("limit")}
						className={cn(
							"px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
							activeTab === "limit"
								? "bg-white/10 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						)}>
						Limit
					</button>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setIsSettingsOpen(true)}
						className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white relative group">
						<Settings className="w-5 h-5" />
						{slippage !== 0.5 && (
							<div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--brand-lime)]" />
						)}
					</button>
				</div>
			</div>

			<div className="glass-panel rounded-3xl p-2 relative overflow-hidden">
				<AnimatePresence mode="wait">
					{activeTab === "limit" ? (
						<motion.div
							key="limit"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className="p-2">
							<LimitOrderInterface
								tokenIn={tokenIn}
								tokenOut={tokenOut}
								setTokenIn={setTokenIn}
								setTokenOut={(t) => setTokenOut(t)}
							/>
						</motion.div>
					) : (
						<motion.div
							key="swap"
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 20 }}>
							{/* Input Section */}
							<div className="bg-[#111]/50 rounded-2xl p-4 hover:bg-[#111]/70 transition-colors border border-transparent hover:border-white/5">
								<div className="flex justify-between mb-2">
									<span className="text-zinc-400 text-sm font-medium">Sell</span>
									{tokenOut && (
										<span className="text-zinc-500 text-sm">
											Balance: <span className="text-zinc-300">{formattedBalanceIn}</span>
										</span>
									)}
								</div>
								<div className="flex items-center justify-between gap-4">
									<input
										type="text"
										inputMode="decimal"
										placeholder="0"
										value={amountIn}
										onChange={(e) => {
											if (!e.target.value || /^\d*\.?\d*$/.test(e.target.value)) {
												setAmountIn(e.target.value);
											}
										}}
										className="bg-transparent text-4xl text-white font-medium placeholder-zinc-600 focus:outline-none w-full"
									/>
									<button
										onClick={() => setIsTokenInSelectorOpen(true)}
										className="flex items-center gap-2 bg-[#222] hover:bg-[#333] text-white px-3 py-1.5 rounded-full font-semibold transition-all border border-white/5 hover:border-white/10 shadow-lg min-w-[110px] justify-between">
										<span className="truncate">{tokenIn.symbol}</span>
										<ArrowDown className="w-4 h-4 text-zinc-400" />
									</button>
								</div>
							</div>

							{/* Switch Button */}
							<div className="relative h-2">
								<div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
									<button
										onClick={handleSwitchTokens}
										className="bg-[#1a1a1a] p-2 rounded-xl border-[4px] border-black text-zinc-400 hover:text-[var(--brand-lime)] hover:scale-110 transition-all">
										<ArrowDownUp className="w-4 h-4" />
									</button>
								</div>
							</div>

							{/* Output Section */}
							<div className="bg-[#111]/50 rounded-2xl p-4 hover:bg-[#111]/70 transition-colors border border-transparent hover:border-white/5">
								<div className="flex justify-between mb-2">
									<span className="text-zinc-400 text-sm font-medium">Buy</span>
									{tokenOut && (
										<span className="text-zinc-500 text-sm">
											Balance: <span className="text-zinc-300">{formattedBalanceOut}</span>
										</span>
									)}
								</div>
								<div className="flex items-center justify-between gap-4">
									<input
										type="text"
										readOnly
										placeholder="0"
										value={amountOut}
										className="bg-transparent text-4xl text-white font-medium placeholder-zinc-600 focus:outline-none w-full cursor-default"
									/>
									<button
										onClick={() => setIsTokenOutSelectorOpen(true)}
										className={cn(
											"flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold transition-all border border-white/5 hover:border-white/10 shadow-lg min-w-[110px] justify-between",
											tokenOut
												? "bg-[#222] hover:bg-[#333] text-white"
												: "bg-[var(--brand-lime)] text-black hover:bg-[var(--brand-lime)]/90"
										)}>
										<span className="truncate">
											{tokenOut ? tokenOut.symbol : "Select"}
										</span>
										<ArrowDown className="w-4 h-4 opacity-60" />
									</button>
								</div>
							</div>

							{/* Price Info or Error */}
							{poolNotFound && tokenOut && !isWrapAction ? (
								<div className="px-4 py-3 flex text-xs text-red-400 font-medium">
									Pool not found for this pair.
								</div>
							) : price ? (
								<div className="px-4 py-3 flex justify-between text-xs text-zinc-500">
									<span>
										1 {tokenIn.symbol} = {price.toFixed(4)} {tokenOut?.symbol}
									</span>
									{!isWrapAction && (
										<span className="flex items-center gap-1">
											<Settings className="w-3 h-3" />
											Slippage:{" "}
											<span
												className={
													activeSlippage > 10 ? "text-orange-500 font-bold" : "text-zinc-300"
												}>
												{activeSlippage}% {isAutoSlippage && "(Auto)"}
											</span>
										</span>
									)}
								</div>
							) : null}

							{/* Price Impact Display */}
							{priceImpact > 0 && (
								<div className="px-4 pb-2 flex justify-between text-xs font-medium">
									<span className="text-zinc-500">Price Impact</span>
									<span
										className={
											priceImpact > 20
												? "text-red-500"
												: priceImpact > 10
												? "text-orange-500"
												: "text-green-500"
										}>
										{priceImpact.toFixed(2)}%
									</span>
								</div>
							)}

							{/* Min Received Display */}
							{tokenOut && amountOut && (
								<div className="px-4 pb-3 flex justify-between text-xs font-medium border-b border-white/5 mb-2">
									<span className="text-zinc-500">Min. Received</span>
									<span className="text-zinc-300">
										{minReceived} {tokenOut.symbol}
									</span>
								</div>
							)}

							{isSimulationErrorAdjusted && amountIn ? (
								<div className="px-4 pb-2 text-xs text-red-500 text-right">
									Simulation failed (Swap may revert)
								</div>
							) : null}

							{/* Action Button */}
							<div className="p-2">
								{!isConnected ? (
									<button
										onClick={() => open()}
										className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white font-bold text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(157,92,255,0.3)] hover:shadow-[0_0_30px_rgba(157,92,255,0.5)] active:scale-[0.98]">
										Connect Wallet
									</button>
								) : poolNotFound && tokenOut && !isWrapAction ? (
									<button
										disabled
										className="w-full bg-zinc-800 text-zinc-500 font-bold text-lg py-4 rounded-xl cursor-not-allowed">
										Pool Not Found
									</button>
								) : !tokenOut ? (
									<button
										disabled
										className="w-full bg-zinc-800 text-zinc-500 font-bold text-lg py-4 rounded-xl cursor-not-allowed">
										Select a Token to Buy
									</button>
								) : !amountIn ? (
									<button
										disabled
										className="w-full bg-zinc-800 text-zinc-500 font-bold text-lg py-4 rounded-xl cursor-not-allowed">
										Enter an Amount
									</button>
								) : isSafetyLocked ? (
									<button
										disabled
										className="w-full bg-red-900/50 text-red-200 font-bold text-lg py-4 rounded-xl cursor-not-allowed border border-red-500/20">
										Price Impact Too High ({priceImpact.toFixed(1)}%)
									</button>
								) : (
									<button
										onClick={handleAction}
										disabled={isPending}
										className={cn(
											"w-full font-bold text-lg py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]",
											isPending
												? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
												: isWrappingVal
												? "bg-[var(--brand-lime)] text-black"
												: isUnwrappingVal
												? "bg-[var(--brand-lime)] text-black"
												: needsApproval
												? "bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white shadow-[0_0_20px_rgba(157,92,255,0.3)]"
												: "bg-[var(--brand-lime)] hover:bg-[var(--brand-lime)]/90 text-black shadow-[0_0_20px_rgba(223,254,0,0.3)] hover:shadow-[0_0_30px_rgba(223,254,0,0.5)]"
										)}>
										{isPending
											? "Processing..."
											: isWrappingVal
											? "Swap"
											: isUnwrappingVal
											? "Swap"
											: needsApproval
											? `Approve ${tokenIn.symbol}`
											: "Swap"}
									</button>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<TokenSelector
				isOpen={isTokenInSelectorOpen}
				onClose={() => setIsTokenInSelectorOpen(false)}
				onSelect={setTokenIn}
				selectedToken={tokenIn}
			/>

			<TokenSelector
				isOpen={isTokenOutSelectorOpen}
				onClose={() => setIsTokenOutSelectorOpen(false)}
				onSelect={setTokenOut}
				selectedToken={tokenOut}
			/>

			{/* Settings Modal */}
			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				slippage={slippage}
				setSlippage={setSlippage}
				isAutoSlippage={isAutoSlippage}
				setIsAutoSlippage={setIsAutoSlippage}
				deadline={deadline}
				setDeadline={setDeadline}
			/>
		</div>
	);
}
