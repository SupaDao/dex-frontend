import { type Address, type Hash } from "viem";

export interface Token {
	address: Address;
	symbol: string;
	decimals: number;
	name: string;
	logoURI?: string;
}

export interface Auction {
	address: Address;
	token0: Token;
	token1: Token;
	currentBatchId: bigint;
	batchDuration: bigint;
}

export interface OrderWithFillStatus {
	orderHash: Hash;
	maker: Address;
	side: 0 | 1; // 0 = buy, 1 = sell
	amount: bigint;
	filledAmount: bigint;
	limitPrice: bigint;
	expiry: bigint;
	status: "active" | "partially_filled" | "filled" | "cancelled" | "expired";
	allowPartialFill: boolean;
	tokenIn: Token;
	tokenOut: Token;
	createdAt: number;
	fillHistory: BatchFill[];
}

export interface BatchFill {
	batchId: bigint;
	amount: bigint;
	clearingPrice: bigint;
	timestamp: number;
}

export interface BatchInfo {
	batchId: bigint;
	state: "Open" | "Revealing" | "Settled";
	startBlock: bigint;
	endBlock: bigint;
	clearingPrice: bigint | null;
	totalVolume: bigint;
	buyVolume: bigint;
	sellVolume: bigint;
}

export interface OrderStatus {
	exists: boolean;
	cancelled: boolean;
	filledAmount: bigint;
	totalAmount: bigint;
	maker: Address;
	limitPrice: bigint;
	expiry: bigint;
	side: number;
	allowPartialFill: boolean;
}
