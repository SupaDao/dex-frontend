export const CONTRACTS = {
	factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`,
	router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS as `0x${string}`,
	positionNFT: process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS as `0x${string}`,
	treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`,
	limitOrderBook: process.env
		.NEXT_PUBLIC_LIMIT_ORDER_BOOK_ADDRESS as `0x${string}`,
} as const;

export const SEPOLIA_CHAIN_ID = 11155111;
