"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	slippage: number;
	setSlippage: (value: number) => void;
	isAutoSlippage?: boolean;
	setIsAutoSlippage?: (value: boolean) => void;
	deadline: number;
	setDeadline: (value: number) => void;
}

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0];

export default function SettingsModal({
	isOpen,
	onClose,
	slippage,
	setSlippage,
	isAutoSlippage,
	setIsAutoSlippage,
	deadline,
	setDeadline,
}: SettingsModalProps) {
	const [customSlippage, setCustomSlippage] = React.useState<string>("");

	// Update custom input if presets are not matched
	React.useEffect(() => {
		if (!SLIPPAGE_PRESETS.includes(slippage)) {
			setCustomSlippage(slippage.toString());
		} else {
			setCustomSlippage("");
		}
	}, [slippage]);

	const handleCustomSlippageChange = (val: string) => {
		setCustomSlippage(val);
		const num = parseFloat(val);
		if (!isNaN(num)) {
			setSlippage(num);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
						onClick={onClose}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -20 }}
						className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#090909] border border-white/10 rounded-3xl p-6 z-[101] shadow-2xl">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-bold text-white">Settings</h3>
							<button
								onClick={onClose}
								className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Slippage */}
						<div className="mb-6">
							<div className="flex items-center gap-2 mb-3">
								<span className="text-sm font-medium text-zinc-400">
									Slippage Tolerance
								</span>
								<Info className="w-3.5 h-3.5 text-zinc-600" />
							</div>
							<div className="flex gap-2 mb-3">
								<button
									onClick={() => {
										setIsAutoSlippage?.(true);
										setCustomSlippage("");
									}}
									className={cn(
										"flex-1 py-2 rounded-xl text-sm font-bold transition-all",
										isAutoSlippage
											? "bg-[var(--brand-lime)] text-black"
											: "bg-white/5 text-zinc-400 hover:bg-white/10"
									)}>
									Auto
								</button>
								{SLIPPAGE_PRESETS.map((preset) => (
									<button
										key={preset}
										onClick={() => {
											setSlippage(preset);
											setCustomSlippage("");
											setIsAutoSlippage?.(false);
										}}
										className={cn(
											"flex-1 py-2 rounded-xl text-sm font-bold transition-all",
											!isAutoSlippage && slippage === preset && !customSlippage
												? "bg-[var(--brand-lime)] text-black"
												: "bg-white/5 text-zinc-400 hover:bg-white/10"
										)}>
										{preset}%
									</button>
								))}
							</div>
							<div
								className={cn(
									"flex items-center bg-[#111] border rounded-xl px-4 py-3 transition-colors",
									customSlippage
										? "border-[var(--brand-lime)]/50"
										: "border-white/5 focus-within:border-white/20"
								)}>
								<input
									type="text"
									placeholder="Custom"
									value={customSlippage}
									onChange={(e) => {
										handleCustomSlippageChange(e.target.value);
										setIsAutoSlippage?.(false);
									}}
									className="bg-transparent w-full text-right text-white font-bold outline-none placeholder-zinc-600"
								/>
								<span className="text-zinc-500 font-bold ml-1">%</span>
							</div>
							{slippage > 5 && (
								<div className="text-orange-500 text-xs mt-2 flex items-center gap-1">
									<Info className="w-3 h-3" /> High slippage tolerance
								</div>
							)}
						</div>

						{/* Deadline */}
						<div>
							<div className="flex items-center gap-2 mb-3">
								<span className="text-sm font-medium text-zinc-400">
									Transaction Deadline
								</span>
								<Info className="w-3.5 h-3.5 text-zinc-600" />
							</div>
							<div className="flex items-center bg-[#111] border border-white/5 rounded-xl px-4 py-3 w-1/2">
								<input
									type="text"
									value={deadline}
									onChange={(e) => {
										const val = parseInt(e.target.value);
										if (!isNaN(val)) setDeadline(val);
									}}
									className="bg-transparent w-full text-right text-white font-bold outline-none"
								/>
								<span className="text-zinc-500 font-bold ml-2">min</span>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
