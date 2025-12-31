"use client";

import React from "react";
import { TOKENS } from "@/lib/contracts/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useConnection } from "wagmi";
import { formatUnits } from "viem";

function TokenBalanceItem({ token, address }: { token: any; address: any }) {
	const { data: balance } = useTokenBalance(token.address, address);

	return (
		<div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
					{token.symbol[0]}
				</div>
				<div>
					<div className="font-bold text-white">{token.symbol}</div>
					<div className="text-xs text-zinc-500">{token.name}</div>
				</div>
			</div>
			<div className="text-right">
				<div className="font-bold text-white text-lg">
					{balance
						? parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)
						: "0.00"}
				</div>
				<div className="text-xs text-zinc-500">Balance</div>
			</div>
		</div>
	);
}

export default function WalletOverview() {
	const { address, isConnected } = useConnection();

	if (!isConnected) {
		return (
			<div className="glass-panel p-6 rounded-3xl text-center mb-8">
				<h2 className="text-xl font-bold text-white mb-2">Portfolio Overview</h2>
				<p className="text-zinc-500">
					Connect your wallet to view your asset balances.
				</p>
			</div>
		);
	}

	return (
		<div className="glass-panel p-6 rounded-3xl mb-8">
			<h2 className="text-xl font-bold text-white mb-6">Asset Balances</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{TOKENS.map((token) => (
					<TokenBalanceItem
						key={token.address}
						token={token}
						address={address}
					/>
				))}
			</div>
		</div>
	);
}
