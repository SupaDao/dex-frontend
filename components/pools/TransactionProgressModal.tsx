"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { Token } from "@/lib/contracts/tokens";

export type TransactionStatus =
	| "idle"
	| "creating_pool"
	| "initializing_pool"
	| "approving_0"
	| "approving_1"
	| "minting"
	| "increasing_liquidity"
	| "success"
	| "error";

interface TransactionProgressModalProps {
	isOpen: boolean;
	onClose: () => void;
	token0: Token;
	token1: Token;
	amount0: string;
	amount1: string;
	status: TransactionStatus;
	needsCreate: boolean;
	needsInitialize: boolean;
	needsApproval0: boolean;
	needsApproval1: boolean;
	error?: string;
	txHash?: string;
}

export default function TransactionProgressModal({
	isOpen,
	onClose,
	token0,
	token1,
	amount0,
	amount1,
	status,
	needsCreate,
	needsInitialize,
	needsApproval0,
	needsApproval1,
	error,
	txHash,
}: TransactionProgressModalProps) {
	if (!isOpen) return null;

	const steps = [
		{
			id: "create",
			label: "Create Pool",
			completed:
				!needsCreate ||
				(status !== "creating_pool" &&
					(status === "initializing_pool" ||
						status === "approving_0" ||
						status === "approving_1" ||
						status === "minting" ||
						status === "success")),
			current: status === "creating_pool",
			required: needsCreate,
		},
		{
			id: "init",
			label: "Initialize Pool",
			completed:
				(!needsCreate && !needsInitialize) ||
				(needsCreate &&
					status !== "creating_pool" &&
					status !== "initializing_pool") ||
				(!needsCreate && needsInitialize && status !== "initializing_pool"),
			current: status === "initializing_pool",
			required: needsInitialize || needsCreate,
		},
		{
			id: "approve_0",
			label: `Approve ${token0.symbol}`,
			completed:
				!needsApproval0 ||
				(status !== "approving_0" &&
					status !== "creating_pool" &&
					status !== "initializing_pool" &&
					status !== "idle" &&
					status !== "error"),
			current: status === "approving_0",
			required: needsApproval0,
		},
		{
			id: "approve_1",
			label: `Approve ${token1.symbol}`,
			completed: !needsApproval1 || status === "minting" || status === "success",
			current: status === "approving_1",
			required: needsApproval1,
		},
		{
			id: "mint",
			label:
				status === "increasing_liquidity"
					? "Increasing Liquidity"
					: "Add Liquidity",
			completed: status === "success",
			current: status === "minting" || status === "increasing_liquidity",
			required: true,
		},
	].filter((step) => step.required);

	// Better step completion logic
	const isStepCompleted = (stepId: string) => {
		const stepOrder = [
			"idle",
			"create",
			"init",
			"approve_0",
			"approve_1",
			"mint",
			"success",
		];

		const statusToStepId: Record<string, string> = {
			idle: "idle",
			creating_pool: "create",
			initializing_pool: "init",
			approving_0: "approve_0",
			approving_1: "approve_1",
			minting: "mint",
			increasing_liquidity: "mint",
			success: "success",
			error: "idle",
		};

		const currentStepId = statusToStepId[status] || "idle";
		const currentIndex = stepOrder.indexOf(currentStepId);

		// Special case: if we are in minting stage (mint or increase), prior steps are done.
		if (currentStepId === "mint") {
			if (
				stepId === "approve_0" ||
				stepId === "approve_1" ||
				stepId === "init" ||
				stepId === "create"
			)
				return true;
		}

		if (status === "success") return true;

		const stepIndex = stepOrder.indexOf(stepId);
		return currentIndex > stepIndex;
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
				<motion.div
					initial={{ scale: 0.95, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.95, opacity: 0 }}
					className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
					<button
						onClick={onClose}
						className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-10">
						<X className="w-5 h-5" />
					</button>

					<div className="p-6">
						<h3 className="text-xl font-bold text-white mb-1">
							{status === "success" ? "Liquidity Added!" : "Processing..."}
						</h3>
						<p className="text-zinc-400 text-xs mb-6">
							{status === "success"
								? "Your liquidity position has been successfully created."
								: "Please follow the instructions in your wallet."}
						</p>

						<div className="space-y-4">
							{steps.map((step, index) => {
								const completed = isStepCompleted(step.id);
								return (
									<div
										key={step.id}
										className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
											step.current
												? "bg-white/5 border-(--brand-lime)/50"
												: completed
												? "bg-white/5 border-white/10"
												: "bg-transparent border-white/5 opacity-50"
										}`}>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center border ${
														completed
															? "bg-brand-lime border-brand-lime text-black"
															: step.current
															? "border-brand-lime text-brand-lime"
															: "border-zinc-700 text-zinc-500"
													}`}>
													{completed ? (
														<Check className="w-4 h-4" />
													) : step.current ? (
														<Loader2 className="w-4 h-4 animate-spin" />
													) : (
														<span className="text-xs font-bold">{index + 1}</span>
													)}
												</div>
												<span
													className={`font-bold ${
														step.current ? "text-white" : "text-zinc-400"
													}`}>
													{step.label}
												</span>
											</div>
											{step.current && (
												<span className="text-xs text-brand-lime animate-pulse">
													Processing...
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>

						{error && (
							<div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm wrap-break-word">
								{error}
							</div>
						)}

						{status === "success" && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="mt-6">
								<button
									onClick={onClose}
									className="w-full btn-primary py-4 rounded-xl font-bold text-black bg-brand-lime hover:bg-(--brand-lime)/90">
									Close
								</button>
							</motion.div>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
