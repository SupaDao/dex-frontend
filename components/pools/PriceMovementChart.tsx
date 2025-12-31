"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface PriceMovementChartProps {
	symbol0: string;
	symbol1: string;
	currentPrice: number;
}

export default function PriceMovementChart({
	symbol0,
	symbol1,
	currentPrice,
}: PriceMovementChartProps) {
	const [timeRange, setTimeRange] = useState("1D");
	const [chartColor, setChartColor] = useState("#22c55e"); // Green by default

	// Generate mock data based on current price and time range
	const data = useMemo(() => {
		if (!currentPrice) return [];

		const now = Date.now();
		const points = 50;
		let period = 24 * 60 * 60 * 1000; // 1D default

		if (timeRange === "1W") period = 7 * 24 * 60 * 60 * 1000;
		if (timeRange === "1M") period = 30 * 24 * 60 * 60 * 1000;
		if (timeRange === "1Y") period = 365 * 24 * 60 * 60 * 1000;

		const startTime = now - period;
		const result = [];

		let price = currentPrice * (0.9 + Math.random() * 0.2); // Start somewhere nearby

		for (let i = 0; i <= points; i++) {
			const time = startTime + (period * i) / points;

			// Random walk
			const change = (Math.random() - 0.5) * 0.05; // 5% vol
			price = price * (1 + change);

			// Force last point to be current price for continuity
			if (i === points) price = currentPrice;

			result.push({
				time,
				value: price,
				formattedTime: format(time, timeRange === "1D" ? "HH:mm" : "MMM dd"),
			});
		}

		// Determine color based on start vs end
		const startPrice = result[0].value;
		const endPrice = result[result.length - 1].value;
		setChartColor(endPrice >= startPrice ? "#22c55e" : "#ef4444");

		return result;
	}, [currentPrice, timeRange]);

	return (
		<div className="w-full h-full flex flex-col">
			{/* Header / Tabs */}
			<div className="flex items-center justify-between mb-4 px-4">
				<div className="text-xs text-zinc-500">
					<span
						className={`font-bold text-lg mr-2`}
						style={{ color: chartColor }}>
						{currentPrice.toFixed(6)}
					</span>
					{symbol1}/{symbol0}
				</div>
			</div>

			<div className="flex-1 min-h-0">
				<ResponsiveContainer
					width="100%"
					height="100%">
					<AreaChart data={data}>
						<defs>
							<linearGradient
								id="colorValue"
								x1="0"
								y1="0"
								x2="0"
								y2="1">
								<stop
									offset="5%"
									stopColor={chartColor}
									stopOpacity={0.3}
								/>
								<stop
									offset="95%"
									stopColor={chartColor}
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="#ffffff10"
							vertical={false}
						/>
						<XAxis
							dataKey="formattedTime"
							stroke="#52525b"
							fontSize={10}
							tickLine={false}
							axisLine={false}
							minTickGap={30}
						/>
						<YAxis
							hide
							domain={["auto", "auto"]}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "#18181b",
								border: "1px solid #27272a",
								color: "#fff",
							}}
							itemStyle={{ color: "#e4e4e7" }}
							labelStyle={{ color: "#a1a1aa", marginBottom: "0.25rem" }}
							formatter={(value: number) => [value.toFixed(6), "Price"]}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke={chartColor}
							fillOpacity={1}
							fill="url(#colorValue)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			{/* Time Range Selector */}
			<div className="flex items-center gap-2 mt-4 px-4">
				{["1D", "1W", "1M", "1Y", "All"].map((range) => (
					<button
						key={range}
						onClick={() => setTimeRange(range)}
						className={`text-[10px] font-medium px-3 py-1 rounded-full transition-colors ${
							timeRange === range
								? "bg-zinc-800 text-white"
								: "text-zinc-500 hover:text-zinc-300"
						}`}>
						{range}
					</button>
				))}
			</div>
		</div>
	);
}
