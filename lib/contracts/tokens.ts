export interface Token {
	address: `0x${string}`;
	symbol: string;
	name: string;
	decimals: number;
	logoURI?: string;
}

// Sepolia testnet tokens
export const TOKENS: Token[] = [
	{
		address: "0x0000000000000000000000000000000000000000", // Native ETH
		symbol: "ETH",
		name: "Ether",
		decimals: 18,
	},
	{
		address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
		symbol: "WETH",
		name: "Wrapped Ether",
		decimals: 18,
	},
	{
		address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
		symbol: "DAI",
		name: "Dai Stablecoin",
		decimals: 18,
	},
	// Add more tokens as needed
];

export const getTokenByAddress = (address: string): Token | undefined => {
	return TOKENS.find(
		(token) => token.address.toLowerCase() === address.toLowerCase()
	);
};

export const getTokenBySymbol = (symbol: string): Token | undefined => {
	return TOKENS.find(
		(token) => token.symbol.toLowerCase() === symbol.toLowerCase()
	);
};

export const getDisplaySymbol = (symbol: string, address?: string): string => {
	if (!symbol) return "";

	// 1. If it's explicitly the Native ETH address (0x0)
	if (address === "0x0000000000000000000000000000000000000000") {
		return "ETH";
	}

	// 2. If it's the WETH address, map to ETH for standardized display in pool lists
	const WETH_ADDR = TOKENS.find((t) => t.symbol === "WETH")?.address;
	if (
		address &&
		WETH_ADDR &&
		address.toLowerCase() === WETH_ADDR.toLowerCase()
	) {
		return "ETH";
	}

	// 3. Fallback for cases where we only have the symbol (like some on-chain data)
	if (symbol.toUpperCase() === "WETH" || symbol.toUpperCase() === "WETH9") {
		return "ETH";
	}

	return symbol;
};
