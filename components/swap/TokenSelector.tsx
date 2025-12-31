"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOKENS, Token } from "@/lib/contracts/tokens";
import { Search, X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTokenList } from "@/hooks/useTokenList";
import { useTokenDetails } from "@/hooks/useTokenDetails";
import { isAddress, type Address } from "viem";

interface TokenSelectorProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (token: Token) => void;
	selectedToken?: Token;
}

export function TokenSelector({
	isOpen,
	onClose,
	onSelect,
	selectedToken,
}: TokenSelectorProps) {
	const [search, setSearch] = useState("");
	const { tokens: fetchedTokens, isLoading: isListLoading } = useTokenList();

	// Local storage for custom imported tokens
	const [importedTokens, setImportedTokens] = useState<Token[]>([]);

	useEffect(() => {
		const stored = localStorage.getItem("supadao_imported_tokens");
		if (stored) {
			try {
				setImportedTokens(JSON.parse(stored));
			} catch (e) {
				console.error("Failed to parse imported tokens", e);
			}
		}
	}, []);

	const addImportedToken = (token: Token) => {
		const newTokens = [...importedTokens, token];
		setImportedTokens(newTokens);
		localStorage.setItem("supadao_imported_tokens", JSON.stringify(newTokens));
	};

	// Merge lists: URLs > Imported > Pinned (Preference order)
	// Actually typically: Pinned (Top) > Imported > Fetched
	const allTokens = useMemo(() => {
		const tokenMap = new Map<string, Token>();

		// 1. Pinned
		TOKENS.forEach((t) => tokenMap.set(t.address.toLowerCase(), t));

		// 2. Imported (Overwrite/Add)
		importedTokens.forEach((t) => tokenMap.set(t.address.toLowerCase(), t));

		// 3. Fetched (Add if missing)
		fetchedTokens.forEach((t) => {
			if (!tokenMap.has(t.address.toLowerCase())) {
				tokenMap.set(t.address.toLowerCase(), t);
			}
		});

		return Array.from(tokenMap.values());
	}, [fetchedTokens, importedTokens]);

	// Filter logic
	const filteredTokens = useMemo(() => {
		if (!search) return allTokens.slice(0, 50);

		return allTokens.filter(
			(token) =>
				token.symbol.toLowerCase().includes(search.toLowerCase()) ||
				token.name.toLowerCase().includes(search.toLowerCase()) ||
				token.address.toLowerCase() === search.toLowerCase()
		);
	}, [allTokens, search]);

	// Custom Token Search Logic
	const isSearchAddress = isAddress(search);
	const foundInList = filteredTokens.length > 0;
	const showImport = isSearchAddress && !foundInList;

	// Fetch details if it's a new address
	const {
		name,
		symbol,
		decimals,
		isLoading: isDetailsLoading,
	} = useTokenDetails(showImport ? (search as Address) : undefined);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
						onClick={onClose}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ type: "spring", duration: 0.5 }}
						className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-[#090909] border border-white/10 rounded-3xl z-[101] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
						<div className="flex items-center justify-between mb-6 flex-shrink-0">
							<h2 className="text-xl font-bold text-white">Select a token</h2>
							<button
								onClick={onClose}
								className="p-2 hover:bg-white/5 rounded-full transition-colors"
								aria-label="Close">
								<X className="w-5 h-5 text-zinc-400" />
							</button>
						</div>

						<div className="relative mb-6 flex-shrink-0">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
							<input
								type="text"
								placeholder="Search name or paste address"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--brand-purple)] focus:bg-[#151515] transition-all text-lg"
								autoFocus
							/>
						</div>

						<div className="flex-1 overflow-y-auto pr-1 -mr-2 custom-scrollbar space-y-1">
							{/* Loading State */}
							{isListLoading && filteredTokens.length === 0 && (
								<div className="text-center py-8 text-zinc-500 animate-pulse">
									Loading token list...
								</div>
							)}

							{filteredTokens.length > 0 && (
								<>
									<div className="text-xs font-medium text-zinc-500 mb-2 px-2 sticky top-0 bg-[#090909] py-2 z-10 flex justify-between">
										<span>TOKENS</span>
										<span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
											{filteredTokens.length} found
										</span>
									</div>
									{filteredTokens.map((token) => (
										<button
											key={token.address}
											onClick={() => {
												onSelect(token);
												onClose();
											}}
											className={cn(
												"w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group",
												selectedToken?.address.toLowerCase() ===
													token.address.toLowerCase() &&
													"bg-white/5 opacity-50 cursor-default pointer-events-none"
											)}
											disabled={
												selectedToken?.address.toLowerCase() === token.address.toLowerCase()
											}>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-white/5 group-hover:border-[var(--brand-lime)]/50 transition-colors shadow-inner overflow-hidden relative">
													{token.logoURI ? (
														<img
															src={token.logoURI}
															alt={token.symbol}
															className="w-full h-full object-cover"
															onError={(e) => (e.currentTarget.style.display = "none")}
														/>
													) : (
														<span className="text-sm font-bold text-zinc-400 group-hover:text-[var(--brand-lime)]">
															{token.symbol[0]}
														</span>
													)}
												</div>
												<div className="text-left">
													<div className="font-semibold text-white group-hover:text-[var(--brand-lime)] transition-colors">
														{token.symbol}
													</div>
													<div className="text-xs text-zinc-500">{token.name}</div>
												</div>
											</div>
										</button>
									))}
								</>
							)}

							{filteredTokens.length === 0 && !showImport && !isListLoading && (
								<div className="text-center py-12 text-zinc-500">No tokens found</div>
							)}

							{showImport && (
								<div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
									<div className="flex items-center gap-2 text-orange-400 font-bold mb-2">
										<AlertTriangle className="w-5 h-5" />
										Import Token
									</div>

									{isDetailsLoading ? (
										<div className="flex items-center gap-2 py-4 text-zinc-400">
											<Loader2 className="w-4 h-4 animate-spin" />
											Fetching token details...
										</div>
									) : name ? (
										<div className="mb-4 bg-black/20 p-3 rounded-lg border border-orange-500/10">
											<div className="text-white font-bold">{symbol}</div>
											<div className="text-sm text-zinc-400">{name}</div>
											<div className="text-xs text-zinc-600 font-mono mt-1">{search}</div>
										</div>
									) : (
										<div className="mb-4 text-red-400 text-sm">
											Could not fetch token details. Verify the address.
										</div>
									)}

									<button
										disabled={!name || isDetailsLoading}
										onClick={() => {
											const newToken: Token = {
												address: search as Address,
												symbol: symbol || "UNKNOWN",
												name: name || "Imported Token",
												decimals: decimals || 18,
											};
											addImportedToken(newToken); // Persist
											onSelect(newToken);
											onClose();
										}}
										className="w-full bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-orange-400 py-3 rounded-xl font-bold transition-colors">
										I Understand, Import
									</button>
								</div>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
