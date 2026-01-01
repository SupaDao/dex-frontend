"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useConnection } from "wagmi";
import { useSearchParams } from "next/navigation";
import {
	AlertCircle,
	CheckCircle2,
	X,
	ChevronLeft,
	Info,
	Receipt,
} from "lucide-react";
import Link from "next/link";
import { type Address, formatUnits } from "viem";

import { usePositions } from "@/hooks/usePositions";
import { useRemoveLiquidity } from "@/hooks/useRemoveLiquidity";
import { usePoolInfo } from "@/hooks/usePoolInfo";
import { useTokenDetails } from "@/hooks/useTokenDetails";
import { usePoolState } from "@/hooks/usePoolState";
import { getTokenByAddress, getDisplaySymbol } from "@/lib/contracts/tokens";
import { cn } from "@/lib/utils";
import {
	getAmountsForLiquidity,
	getSqrtRatioAtTick,
} from "@/lib/web3/liquidityMath";

const PERCENTAGES = [25, 50, 75, 100];

interface RemoveLiquidityFormProps {
	tokenId?: string;
	onClose?: () => void;
	onSuccess?: () => void;
}

export default function RemoveLiquidityForm({
	tokenId,
	onClose,
	onSuccess,
}: RemoveLiquidityFormProps = {}) {
	const searchParams = useSearchParams();
	const tokenIdParam = tokenId || searchParams.get("tokenId");

	const { address } = useConnection();
	const { positions, isLoading: isPositionsLoading } = usePositions();
	const {
		removeLiquidity,
		isPending,
		isConfirming,
		isSuccess,
		hash,
		error: removeError,
	} = useRemoveLiquidity();

	useEffect(() => {
		if (isSuccess) {
			onSuccess?.();
		}
	}, [isSuccess, onSuccess]);

	const [percentage, setPercentage] = useState<string>("25.00");
	const [step, setStep] = useState<"input" | "review">("input");

	const handlePercentageChange = (val: string) => {
		// Clean the input: only numbers and one decimal point
		let cleaned = val.replace(/[^0-9.]/g, "");
		const parts = cleaned.split(".");
		if (parts.length > 2) cleaned = parts[0] + "." + parts[1];
		if (parts[1]?.length > 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);

		const num = parseFloat(cleaned);
		if (isNaN(num)) {
			setPercentage(cleaned);
			return;
		}

		if (num > 100) cleaned = "100.00";
		setPercentage(cleaned);
	};

	// Find position
	const position = positions.find((p) => p.tokenId.toString() === tokenIdParam);

	// Fetch improved pool/token info
	const {
		token0: t0Addr,
		token1: t1Addr,
		fee: poolFee,
	} = usePoolInfo(position?.pool as Address | undefined);

	const { data: slot0 } = usePoolState(position?.pool as Address | undefined);
	const sqrtPriceX96 = slot0?.[0];

	const t0Details = useTokenDetails(t0Addr);
	const t1Details = useTokenDetails(t1Addr);

	const token0 = React.useMemo(() => {
		if (!t0Addr) return undefined;
		return {
			symbol: getDisplaySymbol(
				getTokenByAddress(t0Addr)?.symbol || t0Details.symbol || t0Addr.slice(0, 6),
				t0Addr
			),
			address: t0Addr,
			decimals: t0Details.decimals || 18,
		};
	}, [t0Addr, t0Details]);

	const token1 = React.useMemo(() => {
		if (!t1Addr) return undefined;
		return {
			symbol: getDisplaySymbol(
				getTokenByAddress(t1Addr)?.symbol || t1Details.symbol || t1Addr.slice(0, 6),
				t1Addr
			),
			address: t1Addr,
			decimals: t1Details.decimals || 18,
		};
	}, [t1Addr, t1Details]);

	const { amount0ToRemove, amount1ToRemove, liquidityToRemove } =
		React.useMemo(() => {
			if (!position || !sqrtPriceX96)
				return { amount0ToRemove: 0n, amount1ToRemove: 0n, liquidityToRemove: 0n };

			const liquidity = BigInt(position.liquidity);
			const pctNum = parseFloat(percentage) || 0;
			// Use 4 decimal places precision for calculation (100 * 100)
			const toRemove = (liquidity * BigInt(Math.floor(pctNum * 100))) / 10000n;

			const sqrtRatioAX96 = getSqrtRatioAtTick(Number(position.tickLower));
			const sqrtRatioBX96 = getSqrtRatioAtTick(Number(position.tickUpper));

			const { amount0, amount1 } = getAmountsForLiquidity(
				sqrtPriceX96,
				sqrtRatioAX96,
				sqrtRatioBX96,
				toRemove
			);

			return {
				amount0ToRemove: amount0,
				amount1ToRemove: amount1,
				liquidityToRemove: toRemove,
			};
		}, [position, sqrtPriceX96, percentage]);

	const handleRemove = () => {
		if (!position || !address) return;
		const pctNum = parseFloat(percentage) || 0;
		if (pctNum <= 0) return;
		removeLiquidity(position.tokenId, liquidityToRemove, 0n, 0n, address);
	};

	if (isPositionsLoading) {
		return (
			<div className="flex flex-col items-center justify-center p-20 space-y-4">
				<div className="w-12 h-12 border-4 border-[var(--brand-lime)]/20 border-t-[var(--brand-lime)] rounded-full animate-spin" />
				<p className="text-zinc-500 font-medium">Fetching position details...</p>
			</div>
		);
	}

	if (!position) {
		return (
			<div className="text-center p-12 bg-[#050505] rounded-[40px] border border-white/5 shadow-2xl">
				<div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500">
					<AlertCircle className="w-10 h-10" />
				</div>
				<h3 className="text-2xl font-bold text-white mb-2">Position Not Found</h3>
				<p className="text-zinc-500 mb-8 max-w-xs mx-auto">
					The position #{tokenIdParam} could not be located on-chain.
				</p>
				<Link
					href="/pools"
					className="block w-full py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10">
					Back to Pools
				</Link>
			</div>
		);
	}

	const f0 = Number(position.tokensOwed0) / 10 ** (token0?.decimals || 18);
	const f1 = Number(position.tokensOwed1) / 10 ** (token1?.decimals || 18);

	const formattedR0 = formatUnits(amount0ToRemove, token0?.decimals || 18);
	const formattedR1 = formatUnits(amount1ToRemove, token1?.decimals || 18);

	return (
		<div className="relative w-full max-w-md mx-auto bg-[#0A0A0A] rounded-[24px] border border-white/10 shadow-3xl overflow-hidden">
			{/* Glassy Background Accents */}
			<div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--brand-lime)]/10 rounded-full blur-[80px]" />
			<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px]" />

			<div className="relative z-10">
				{/* Header */}
				<div className="p-8 pb-4 flex items-center justify-between">
					<div className="flex items-center gap-5">
						<div className="flex -space-x-3">
							<div className="w-12 h-12 rounded-full bg-[#1A1A1A] border-2 border-[#050505] flex items-center justify-center text-xs font-bold shadow-lg overflow-hidden">
								<div className="w-full h-full flex items-center justify-center bg-blue-500/20 text-blue-400">
									{token0?.symbol[0]}
								</div>
							</div>
							<div className="w-12 h-12 rounded-full bg-[#1A1A1A] border-2 border-[#050505] flex items-center justify-center text-xs font-bold shadow-lg overflow-hidden">
								<div className="w-full h-full flex items-center justify-center bg-purple-500/20 text-purple-400">
									{token1?.symbol[0]}
								</div>
							</div>
						</div>
						<div>
							<h1 className="text-xl font-black text-white flex items-center gap-3">
								{token0?.symbol} / {token1?.symbol}
							</h1>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="text-[9px] text-zinc-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase font-bold">
									{poolFee ? `${poolFee / 10000}%` : "0.3%"} Fee
								</span>
								<div className="flex items-center gap-1.5 text-[9px] items-center text-[var(--brand-lime)] bg-[var(--brand-lime)]/5 px-2 py-0.5 rounded border border-[var(--brand-lime)]/10 font-bold uppercase">
									<Receipt className="w-2.5 h-2.5" />
									Position #{tokenIdParam}
								</div>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{step === "review" && (
							<button
								onClick={() => setStep("input")}
								className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center justify-center hover:bg-white/10">
								<ChevronLeft className="w-5 h-5" />
							</button>
						)}
						{onClose && (
							<button
								onClick={onClose}
								className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center justify-center hover:bg-white/10">
								<X className="w-5 h-5" />
							</button>
						)}
					</div>
				</div>

				<div className="px-8 pb-8 space-y-6">
					{step === "input" ? (
						<>
							{/* Amount Slider Section */}
							<div className="bg-white/[0.02] rounded-[24px] border border-white/5 p-6 space-y-6 backdrop-blur-sm">
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
											Remove Amount
										</span>
										<div className="flex items-baseline gap-1">
											<input
												type="text"
												value={percentage}
												onChange={(e) => handlePercentageChange(e.target.value)}
												className="bg-transparent text-4xl font-black text-white tabular-nums outline-none border-none p-0 w-[140px]"
												placeholder="0.00"
											/>
											<span className="text-2xl font-black text-white/40">%</span>
										</div>
									</div>
									<div className="flex flex-wrap flex-row gap-2 max-w-[120px] justify-end">
										{PERCENTAGES.map((pct) => (
											<button
												key={pct}
												onClick={() =>
													setPercentage(pct === 100 ? "100.00" : pct.toFixed(2))
												}
												className={cn(
													"px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all uppercase tracking-tighter",
													parseFloat(percentage) === pct
														? "bg-[var(--brand-lime)] text-black border-[var(--brand-lime)] shadow-lg shadow-lime-500/20"
														: "bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-white"
												)}>
												{pct === 100 ? "Max" : `${pct}%`}
											</button>
										))}
									</div>
								</div>

								<div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
									<motion.div
										className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--brand-lime)] to-emerald-400"
										initial={false}
										animate={{ width: `${parseFloat(percentage) || 0}%` }}
									/>
									<input
										type="range"
										min="1"
										max="100"
										step="0.01"
										value={parseFloat(percentage) || 0}
										onChange={(e) => handlePercentageChange(e.target.value)}
										className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
									/>
								</div>
							</div>

							{/* Summary of what they get */}
							<div className="space-y-4">
								<div className="flex items-center justify-between px-4">
									<span className="text-zinc-500 text-xs font-black uppercase tracking-widest">
										You will receive
									</span>
									<div className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-bold uppercase tracking-tighter">
										<Info className="w-3 h-3" />
										Includes uncollected fees
									</div>
								</div>

								<div className="grid grid-cols-1 gap-2">
									<div className="bg-white/[0.02] rounded-[20px] border border-white/5 p-4 flex items-center justify-between group hover:border-white/10 transition-all">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xs">
												{token0?.symbol[0]}
											</div>
											<span className="text-base font-bold text-white group-hover:text-[var(--brand-lime)] transition-colors">
												{token0?.symbol}
											</span>
										</div>
										<div className="text-right">
											<span className="text-xl font-black text-white block leading-none">
												{(parseFloat(formattedR0) + f0).toLocaleString(undefined, {
													maximumFractionDigits: 6,
												})}
											</span>
											<span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
												Principal: {parseFloat(formattedR0).toFixed(4)} + Fees:{" "}
												{f0.toFixed(4)}
											</span>
										</div>
									</div>
									<div className="bg-white/[0.02] rounded-[20px] border border-white/5 p-4 flex items-center justify-between group hover:border-white/10 transition-all">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-black text-xs">
												{token1?.symbol[0]}
											</div>
											<span className="text-base font-bold text-white group-hover:text-[var(--brand-lime)] transition-colors">
												{token1?.symbol}
											</span>
										</div>
										<div className="text-right">
											<span className="text-xl font-black text-white block leading-none">
												{(parseFloat(formattedR1) + f1).toLocaleString(undefined, {
													maximumFractionDigits: 6,
												})}
											</span>
											<span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
												Principal: {parseFloat(formattedR1).toFixed(4)} + Fees:{" "}
												{f1.toFixed(4)}
											</span>
										</div>
									</div>
								</div>
							</div>

							<button
								onClick={() => setStep("review")}
								disabled={!(parseFloat(percentage) > 0)}
								className="w-full py-4 rounded-[20px] text-base font-black transition-all bg-white text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-lime)] border border-white/5 h-16 shadow-2xl uppercase tracking-tight">
								Review Removal
							</button>
						</>
					) : isSuccess ? (
						<div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-500">
							<div className="w-20 h-20 rounded-full bg-[var(--brand-lime)]/10 flex items-center justify-center mx-auto text-[var(--brand-lime)] shadow-[0_0_50px_rgba(var(--brand-lime-rgb),0.1)]">
								<CheckCircle2 className="w-10 h-10" />
							</div>
							<div className="space-y-2">
								<h3 className="text-3xl font-black text-white uppercase tracking-tighter">
									Success!
								</h3>
								<p className="text-zinc-500 text-sm font-medium">
									Your liquidity has been successfully withdrawn.
								</p>
							</div>

							<div className="bg-white/5 rounded-2xl p-5 border border-white/5 max-w-[320px] mx-auto">
								<div className="flex justify-between items-center mb-3 text-[10px] font-black text-zinc-500 uppercase">
									<span>Withdrawn Tokens</span>
								</div>
								<div className="space-y-1.5">
									<div className="flex justify-between text-white font-bold text-sm">
										<span>{token0?.symbol}</span>
										<span>{(parseFloat(formattedR0) + f0).toFixed(6)}</span>
									</div>
									<div className="flex justify-between text-white font-bold text-sm">
										<span>{token1?.symbol}</span>
										<span>{(parseFloat(formattedR1) + f1).toFixed(6)}</span>
									</div>
								</div>
							</div>

							<button
								onClick={onClose}
								className="w-full py-4 rounded-2xl text-lg font-black transition-all bg-[var(--brand-lime)] text-black hover:bg-[var(--brand-lime)]/90 h-16 shadow-xl shadow-lime-500/10 uppercase">
								Close Modal
							</button>
						</div>
					) : (
						<>
							{/* Review Screen */}
							<div className="bg-white/[0.02] rounded-[30px] border border-white/10 p-8 space-y-8">
								<div className="space-y-1">
									<h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
										Removal Summary
									</h3>
									<p className="text-zinc-400 text-xs">
										Please confirm the details of your liquidity withdrawal.
									</p>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between items-center pb-4 border-b border-white/5">
										<span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
											Percentage
										</span>
										<span className="text-white text-xl font-black tabular-nums">
											{percentage}%
										</span>
									</div>
									<div className="flex justify-between items-center pb-4 border-b border-white/5">
										<div className="flex flex-col">
											<span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest mb-0.5">
												{token0?.symbol} Receive
											</span>
											<span className="text-zinc-600 text-[8px] font-mono">
												{t0Addr?.slice(0, 10)}...
											</span>
										</div>
										<span className="text-white text-xl font-black">
											{(parseFloat(formattedR0) + f0).toFixed(6)}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<div className="flex flex-col">
											<span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest mb-0.5">
												{token1?.symbol} Receive
											</span>
											<span className="text-zinc-600 text-[8px] font-mono">
												{t1Addr?.slice(0, 10)}...
											</span>
										</div>
										<span className="text-white text-xl font-black">
											{(parseFloat(formattedR1) + f1).toFixed(6)}
										</span>
									</div>
								</div>
							</div>

							{removeError && (
								<div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 animate-in fade-in duration-300">
									<AlertCircle className="w-5 h-5 flex-shrink-0" />
									<p className="font-medium">{removeError.message?.slice(0, 100)}...</p>
								</div>
							)}

							<button
								onClick={handleRemove}
								disabled={isPending || isConfirming}
								className="w-full py-4 rounded-2xl text-lg font-black transition-all bg-red-500/90 text-white hover:bg-red-500 border border-red-500/20 h-16 shadow-2xl shadow-red-500/20 uppercase tracking-tight">
								{isPending || isConfirming ? (
									<div className="flex items-center justify-center gap-3">
										<div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
										Confirming...
									</div>
								) : (
									"Confirm Withdrawal"
								)}
							</button>
						</>
					)}

					{hash && !isSuccess && (
						<div className="text-center pt-4">
							<a
								href={`https://sepolia.etherscan.io/tx/${hash}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-[10px] text-zinc-500 hover:text-[var(--brand-lime)] transition-colors font-black uppercase tracking-widest">
								<Receipt className="w-3 h-3" />
								Transaction Hash: {hash.slice(0, 8)}...{hash.slice(-8)}
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
