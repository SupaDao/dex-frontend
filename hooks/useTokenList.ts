import { useState, useEffect } from "react";
import { Token } from "@/lib/contracts/tokens";

const UNISWAP_DEFAULT_LIST = "https://tokens.uniswap.org";

interface TokenListToken {
	chainId: number;
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	logoURI?: string;
}

export function useTokenList() {
	const [tokens, setTokens] = useState<Token[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const fetchTokens = async () => {
			setIsLoading(true);
			try {
				const response = await fetch(UNISWAP_DEFAULT_LIST);
				const data = await response.json();

				// Filter for Sepolia (11155111) or Mainnet (1) depending on environemnt
				// Since this is a testnet demo, we might want Sepolia tokens if available in the list,
				// OR just show Mainnet tokens as "Mock" representations if we are simulating.
				// However, the user specifically wants "Prod level".
				// Real prod app on Sepolia needs Sepolia token list.
				// Uniswap default list is Mainnet.
				// Let's try to fetch a Sepolia compatible list or just filter.
				// For now, I'll filter for Sepolia ID 11155111.
				// If empty, I might fallback to a testnet list like: https://raw.githubusercontent.com/uniswap/default-token-list/main/src/tokens/sepolia.json (if exists)
				// actually Uniswap list has multiple chains.

				const chainId = 11155111; // Sepolia
				const mapTokens = (data.tokens as TokenListToken[])
					.filter((t) => t.chainId === chainId)
					.map((t) => ({
						address: t.address as `0x${string}`,
						symbol: t.symbol,
						name: t.name,
						decimals: t.decimals,
						logoURI: t.logoURI,
					}));

				setTokens(mapTokens);
			} catch (err) {
				console.error("Failed to fetch token list", err);
				setError(err as Error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchTokens();
	}, []);

	return { tokens, isLoading, error };
}
