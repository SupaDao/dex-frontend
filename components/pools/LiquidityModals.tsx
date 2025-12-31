"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import AddLiquidityForm from "./AddLiquidityForm";
import RemoveLiquidityForm from "./RemoveLiquidityForm";
import { cn } from "@/lib/utils";

export type LiquidityModalType = "increase" | "remove" | null;

interface LiquidityModalsProps {
	type: LiquidityModalType;
	tokenId?: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
}

export default function LiquidityModals({
	type,
	tokenId,
	isOpen,
	onClose,
	onSuccess,
}: LiquidityModalsProps) {
	// Prevent scrolling when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="absolute inset-0 bg-black/80 backdrop-blur-xl"
					/>

					{/* Modal Content */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className={cn(
							"relative w-full max-h-[95vh] overflow-y-auto bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl no-scrollbar backdrop-blur-md",
							type === "remove" ? "max-w-md" : "max-w-2xl"
						)}>
						<div className="p-0">
							{type === "increase" && (
								<div className="p-4 sm:p-6">
									<AddLiquidityForm
										tokenId={tokenId}
										onClose={onClose}
										onSuccess={onSuccess}
									/>
								</div>
							)}

							{type === "remove" && (
								<div className="p-4 sm:p-6">
									<RemoveLiquidityForm
										tokenId={tokenId}
										onClose={onClose}
										onSuccess={onSuccess}
									/>
								</div>
							)}
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}
