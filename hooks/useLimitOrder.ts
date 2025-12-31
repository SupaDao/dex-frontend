import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";
import { type Address, parseUnits, type Hash } from "viem";
import { LimitOrderBookService } from "@/lib/services/LimitOrderBookService";
import { Token } from "@/lib/types/dex";

export function useLimitOrder(orderBookAddress?: Address) {
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const { address: userAddress } = useAccount();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const placeOrder = useCallback(
		async (
			tokenIn: Token,
			tokenOut: Token,
			amountIn: string,
			limitPrice: string,
			expiryHours: number = 24,
			allowPartialFill: boolean = true
		): Promise<Hash | null> => {
			if (!publicClient || !walletClient || !orderBookAddress || !userAddress) {
				setError(new Error("Missing clients or connection"));
				return null;
			}

			setIsLoading(true);
			setError(null);

			try {
				const service = new LimitOrderBookService(
					orderBookAddress,
					publicClient,
					walletClient
				);

				const amount = parseUnits(amountIn, tokenIn.decimals);
				const price = parseUnits(limitPrice, 18);
				const expiry = BigInt(
					Math.floor(Date.now() / 1000) + expiryHours * 60 * 60
				);

				// Resolve side dynamically
				const token0Address = await service.getToken0();
				const side =
					tokenIn.address.toLowerCase() === token0Address.toLowerCase() ? 1 : 0;

				const hash = await service.placeOrder(
					amount,
					price,
					side,
					expiry,
					allowPartialFill
				);

				return hash;
			} catch (err) {
				console.error("Error placing limit order:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient, walletClient, orderBookAddress, userAddress]
	);

	const cancelOrder = useCallback(
		async (orderHash: Hash): Promise<Hash | null> => {
			if (!publicClient || !walletClient || !orderBookAddress) {
				setError(new Error("Missing clients or connection"));
				return null;
			}

			setIsLoading(true);
			setError(null);

			try {
				const service = new LimitOrderBookService(
					orderBookAddress,
					publicClient,
					walletClient
				);
				return await service.cancelOrder(orderHash);
			} catch (err) {
				console.error("Error cancelling order:", err);
				setError(err as Error);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[publicClient, walletClient, orderBookAddress]
	);

	return {
		placeOrder,
		cancelOrder,
		isLoading,
		error,
	};
}
