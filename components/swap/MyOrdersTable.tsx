"use client";

import React from "react";
import { X, ExternalLink, Filter, ArrowUpDown } from "lucide-react";
import { type Address, formatUnits } from "viem";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useLimitOrder } from "@/hooks/useLimitOrder";
import { Token } from "@/lib/contracts/tokens";
import { cn } from "@/lib/utils";

interface MyOrdersTableProps {
	orderBookAddress: Address | null;
	token0: Token | undefined;
	token1: Token | undefined;
}

export function MyOrdersTable({
	orderBookAddress,
	token0,
	token1,
}: MyOrdersTableProps) {
	const { orders, isLoading, refresh } = useUserOrders(
		orderBookAddress || undefined,
		token0,
		token1
	);

	const { cancelOrder, isLoading: isCancelling } = useLimitOrder(
		orderBookAddress || undefined
	);

	if (!orderBookAddress || !token0 || !token1) {
		return null;
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "filled":
				return "text-green-400 bg-green-400/10 border-green-400/20";
			case "partially_filled":
				return "text-[var(--brand-lime)] bg-[var(--brand-lime)]/10 border-[var(--brand-lime)]/20";
			case "cancelled":
				return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
			case "expired":
				return "text-red-400 bg-red-400/10 border-red-400/20";
			default:
				return "text-blue-400 bg-blue-400/10 border-blue-400/20";
		}
	};

	return (
		<div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
			{/* Header */}
			<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
				<div className="flex items-center gap-3">
					<h3 className="text-white font-black uppercase tracking-widest text-xs">
						My Orders
					</h3>
					{orders.length > 0 && (
						<span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
							{orders.length}
						</span>
					)}
				</div>
				<button
					onClick={() => refresh()}
					className="text-zinc-500 hover:text-white transition-colors">
					<Filter className="w-4 h-4" />
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="bg-white/[0.01]">
							<th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
								Pair / Side
							</th>
							<th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
								Limit Price
							</th>
							<th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
								Filled / Amount
							</th>
							<th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
								Status
							</th>
							<th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 text-right">
								Action
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{isLoading && orders.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-12 text-center text-zinc-600 italic text-sm">
									<div className="flex items-center justify-center gap-2">
										<div className="animate-spin rounded-full h-4 w-4 border border-[var(--brand-lime)] border-t-transparent" />
										Loading orders...
									</div>
								</td>
							</tr>
						) : orders.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-12 text-center text-zinc-600 italic text-sm">
									No orders found for this market.
								</td>
							</tr>
						) : (
							orders.map((order) => {
								const fillPercent = Number((order.filledAmount * 100n) / order.amount);
								return (
									<tr
										key={order.orderHash}
										className="hover:bg-white/[0.02] transition-colors group">
										<td className="px-6 py-4">
											<div className="flex flex-col">
												<span className="text-white font-bold text-sm flex items-center gap-1">
													{order.tokenIn.symbol}{" "}
													<span className="text-zinc-600 font-normal">/</span>{" "}
													{order.tokenOut.symbol}
												</span>
												<span
													className={cn(
														"text-[10px] font-black uppercase tracking-tighter",
														order.side === 1 ? "text-red-400" : "text-green-400"
													)}>
													{order.side === 1 ? "SELL" : "BUY"}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex flex-col">
												<span className="text-white font-mono font-bold">
													{(Number(order.limitPrice) / 1e18).toFixed(4)}
												</span>
												<span className="text-zinc-600 text-[10px]">
													Per {order.tokenIn.symbol}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex flex-col gap-1.5 w-32">
												<div className="flex justify-between text-[10px] font-mono">
													<span className="text-white">
														{(
															Number(order.filledAmount) /
															10 ** order.tokenIn.decimals
														).toFixed(2)}
													</span>
													<span className="text-zinc-600">
														{(Number(order.amount) / 10 ** order.tokenIn.decimals).toFixed(2)}
													</span>
												</div>
												<div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
													<div
														className={cn(
															"h-full transition-all duration-1000",
															order.status === "filled"
																? "bg-green-400"
																: "bg-[var(--brand-lime)]"
														)}
														style={{ width: `${fillPercent}%` }}
													/>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span
												className={cn(
													"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
													getStatusColor(order.status)
												)}>
												{order.status.replace("_", " ")}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											{order.status === "active" || order.status === "partially_filled" ? (
												<button
													disabled={isCancelling}
													onClick={() => cancelOrder(order.orderHash)}
													className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/10 hover:border-red-500/30 disabled:opacity-50">
													<X className="w-4 h-4" />
												</button>
											) : (
												<div className="text-zinc-700 p-2">
													<ExternalLink className="w-4 h-4 opacity-30" />
												</div>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
