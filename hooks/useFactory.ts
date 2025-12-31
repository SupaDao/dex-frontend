import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { type Address } from "viem";
import { FactoryService } from "@/lib/services/FactoryService";

export function useFactory() {
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const getAuctionAddress = useCallback(
		async (token0: Address, token1: Address): Promise<Address | null> => {
			if (!publicClient) return null;

			setIsLoading(true);
			setError(null);
			try {
				const service = new FactoryService(publicClient);
				const address = await service.getAuctionAddress(token0, token1);
				return address === "0x0000000000000000000000000000000000000000"
					? null
					: address;
			} catch (err) {
				console.error("Error fetching auction address:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient]
	);

	const createAuction = useCallback(
		async (token0: Address, token1: Address): Promise<Address | null> => {
			if (!publicClient || !walletClient) {
				setError(new Error("Public or wallet client not available"));
				return null;
			}

			setIsLoading(true);
			setError(null);
			try {
				const service = new FactoryService(publicClient, walletClient);
				return await service.createAuction(token0, token1);
			} catch (err) {
				console.error("Error creating auction:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient, walletClient]
	);

	const getLimitOrderBookAddress = useCallback(
		async (token0: Address, token1: Address): Promise<Address | null> => {
			if (!publicClient) return null;

			setIsLoading(true);
			setError(null);
			try {
				const service = new FactoryService(publicClient);
				const address = await service.getLimitOrderBookAddress(token0, token1);
				return address === "0x0000000000000000000000000000000000000000"
					? null
					: address;
			} catch (err) {
				console.error("Error fetching limit order book address:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient]
	);

	const createLimitOrderBook = useCallback(
		async (token0: Address, token1: Address): Promise<Address | null> => {
			if (!publicClient || !walletClient) {
				setError(new Error("Public or wallet client not available"));
				return null;
			}

			setIsLoading(true);
			setError(null);
			try {
				const service = new FactoryService(publicClient, walletClient);
				return await service.createLimitOrderBook(token0, token1);
			} catch (err) {
				console.error("Error creating limit order book:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient, walletClient]
	);

	return {
		getAuctionAddress,
		createAuction,
		getLimitOrderBookAddress,
		createLimitOrderBook,
		isLoading,
		error,
	};
}
