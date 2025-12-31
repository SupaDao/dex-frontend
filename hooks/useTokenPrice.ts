import { useState, useEffect } from "react";

const SYMBOL_TO_ID: Record<string, string> = {
	ETH: "ethereum",
	WETH: "ethereum",
	USDC: "usd-coin",
	USDT: "tether",
	DAI: "dai",
	WBTC: "wrapped-bitcoin",
};

export function useTokenPrice(symbol: string | undefined) {
	const [price, setPrice] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!symbol) return;

		const id = SYMBOL_TO_ID[symbol.toUpperCase()];
		if (!id) {
			setPrice(null);
			return;
		}

		const fetchPrice = async () => {
			setIsLoading(true);
			try {
				const response = await fetch(
					`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
				);
				const data = await response.json();
				if (data[id]) {
					setPrice(data[id].usd);
				}
			} catch (error) {
				console.error("Error fetching token price:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPrice();
		// Poll every 60 seconds
		const interval = setInterval(fetchPrice, 60000);
		return () => clearInterval(interval);
	}, [symbol]);

	return { price, isLoading };
}
