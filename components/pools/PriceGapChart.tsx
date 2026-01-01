"use client";

import React from "react";
import {
	BarChart,
	Bar,
	XAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";

interface PriceGapChartProps {
	minPrice: string;
	maxPrice: string;
	currentPrice: string;
	symbol0: string;
	symbol1: string;
}

export default function PriceGapChart({
	minPrice,
	maxPrice,
	currentPrice,
	symbol0,
	symbol1,
}: PriceGapChartProps) {
	const min = parseFloat(minPrice) || 0;
	const max = parseFloat(maxPrice) || 0;
	const current = parseFloat(currentPrice) || 0;

	// Mock data generation for visualization based on inputs
	// In a real app, this would be historical price data or liquidity depth
	// Memoize data generation for visualization
	const data = React.useMemo(() => {
		if (!current) return [];

		const result = [];
		const range = max > 0 && min > 0 ? max - min : current * 0.5;
		const start = min > 0 ? min - range * 0.2 : current * 0.5;
		const end = max > 0 ? max + range * 0.2 : current * 1.5;
		const step = (end - start) / 20;

		for (let i = 0; i <= 20; i++) {
			const price = start + i * step;
			// Bell curve-ish shape centered around current price
			const diff = Math.abs(price - current);
			const density = Math.exp(-(diff * diff) / (2 * (current * 0.1) ** 2)) * 100;

			result.push({
				price: price.toFixed(4),
				density: density + (i % 5) * 2, // Deterministic "randomness"
				val: price,
			});
		}
		return result;
	}, [current, min, max]);

	return (
		<div className="w-full h-75 bg-[#0A0A0A] rounded-2xl p-4 border border-white/5">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-sm font-medium text-zinc-400">Price Range</h3>
				<div className="text-xs text-zinc-500">
					Current Price:{" "}
					<span className="text-white font-bold">{current.toFixed(4)}</span>{" "}
					{symbol1}/{symbol0}
				</div>
			</div>

			<div className="w-full h-60">
				<ResponsiveContainer
					width="100%"
					height="100%">
					<BarChart data={data}>
						<XAxis
							dataKey="price"
							stroke="#52525b"
							fontSize={10}
							tickFormatter={(val) => parseFloat(val).toFixed(2)}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "#18181b",
								border: "1px solid #27272a",
							}}
							itemStyle={{ color: "#e4e4e7" }}
							labelStyle={{ color: "#a1a1aa" }}
						/>
						<Bar
							dataKey="density"
							fill="#3f3f46"
							radius={[4, 4, 0, 0]}
						/>
						{current > 0 && (
							<ReferenceLine
								x={
									data.find((d) => Math.abs(d.val - current) < d.val * 0.1)?.price ||
									current.toFixed(4)
								}
								stroke="var(--brand-lime)"
								strokeDasharray="3 3"
							/>
						)}
						{min > 0 && (
							<ReferenceLine
								x={
									data.find((d) => Math.abs(d.val - min) < d.val * 0.1)?.price ||
									min.toFixed(4)
								}
								stroke="#ef4444"
								label="Min"
							/>
						)}
						{max > 0 && (
							<ReferenceLine
								x={
									data.find((d) => Math.abs(d.val - max) < d.val * 0.1)?.price ||
									max.toFixed(4)
								}
								stroke="#22c55e"
								label="Max"
							/>
						)}
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
