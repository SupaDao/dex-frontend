import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useAccount, useBlockNumber } from "wagmi";
import { type Address } from "viem";
import { LimitOrderBookService } from "@/lib/services/LimitOrderBookService";
import { OrderWithFillStatus, Token } from "@/lib/types/dex";

export function useUserOrders(
	orderBookAddress?: Address,
	token0?: Token,
	token1?: Token
) {
	const { address: userAddress } = useAccount();
	const publicClient = usePublicClient();
	const { data: blockNumber } = useBlockNumber({ watch: true });
	const [orders, setOrders] = useState<OrderWithFillStatus[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const fetchOrders = useCallback(async () => {
		if (!publicClient || !userAddress || !orderBookAddress || !token0 || !token1)
			return;

		setIsLoading(true);
		try {
			const service = new LimitOrderBookService(orderBookAddress, publicClient);
			const hashes = await service.getUserOrders(userAddress);

			const enrichedOrders = await Promise.all(
				hashes.map(async (hash) => {
					const status = await service.getOrderStatus(hash);

					// Determine status string
					let orderStatus: OrderWithFillStatus["status"] = "active";
					if (status.cancelled) orderStatus = "cancelled";
					else if (status.filledAmount >= status.totalAmount) orderStatus = "filled";
					else if (status.filledAmount > 0n) orderStatus = "partially_filled";
					else if (status.expiry < BigInt(Math.floor(Date.now() / 1000)))
						orderStatus = "expired";

					const isSell = status.side === 1;

					return {
						orderHash: hash,
						maker: status.maker,
						side: status.side as 0 | 1,
						amount: status.totalAmount,
						filledAmount: status.filledAmount,
						limitPrice: status.limitPrice,
						expiry: status.expiry,
						status: orderStatus,
						allowPartialFill: status.allowPartialFill,
						tokenIn: isSell ? token0 : token1,
						tokenOut: isSell ? token1 : token0,
						createdAt: 0, // Not stored on-chain, could fetch from events if needed
						fillHistory: [], // Would need event scraping to fill this
					} as OrderWithFillStatus;
				})
			);

			// Sort by expiry (newest first as proxy for created time)
			setOrders(enrichedOrders.sort((a, b) => Number(b.expiry - a.expiry)));
		} catch (err) {
			console.error("Error fetching user orders:", err);
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	}, [publicClient, userAddress, orderBookAddress, token0, token1]);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, blockNumber]);

	return {
		orders,
		isLoading,
		error,
		refresh: fetchOrders,
	};
}
