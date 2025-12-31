import { useEffect, useState, useCallback } from "react";
import { usePublicClient, useBlockNumber } from "wagmi";
import { type Address, type Hash, decodeEventLog } from "viem";
import { Token } from "@/lib/contracts/tokens";
import limitOrderBookAbi from "@/lib/contracts/limit-order-book-abi.json";
import { LimitOrderBookService } from "@/lib/services/LimitOrderBookService";

export interface PriceLevel {
	price: bigint;
	amount: bigint;
	cumulativeAmount: bigint;
	orderCount: number;
}

export interface OrderBookData {
	buyOrders: PriceLevel[];
	sellOrders: PriceLevel[];
	bestBid: bigint | null;
	bestAsk: bigint | null;
	spread: bigint | null;
	spreadPercent: number | null;
}

export function useOrderBook(
	orderBookAddress: Address | undefined,
	token0: Token,
	token1: Token
) {
	const publicClient = usePublicClient();
	const { data: blockNumber } = useBlockNumber({ watch: true });
	const [data, setData] = useState<OrderBookData>({
		buyOrders: [],
		sellOrders: [],
		bestBid: null,
		bestAsk: null,
		spread: null,
		spreadPercent: null,
	});
	const [isLoading, setIsLoading] = useState(false);

	const fetchOrderBook = useCallback(async () => {
		if (!publicClient || !orderBookAddress) return;

		setIsLoading(true);
		try {
			// In a production app, we would use an indexer.
			// Here we scrape recent events (last 1000 blocks) as a proxy.
			const currentBlock = await publicClient.getBlockNumber();
			const fromBlock = currentBlock - 1000n > 0n ? currentBlock - 1000n : 0n;

			const logs = await publicClient.getLogs({
				address: orderBookAddress,
				event: {
					type: "event",
					name: "OrderPlaced",
					inputs: [
						{ type: "bytes32", name: "orderHash", indexed: true },
						{ type: "address", name: "trader", indexed: true },
						{ type: "uint8", name: "side" },
						{ type: "uint128", name: "amount" },
						{ type: "uint128", name: "limitPrice" },
						{ type: "uint64", name: "expiry" },
					],
				},
				fromBlock,
				toBlock: "latest",
			});

			const service = new LimitOrderBookService(orderBookAddress, publicClient);

			// Extract unique hashes
			const hashes = Array.from(new Set(logs.map((log) => log.args.orderHash)));

			// Fetch current status for each (to exclude filled/cancelled)
			const activeOrders = await Promise.all(
				hashes.map(async (hash) => {
					const status = await service.getOrderStatus(hash as Hash);
					if (
						status.exists &&
						!status.cancelled &&
						status.filledAmount < status.totalAmount
					) {
						return {
							price: status.limitPrice,
							amount: status.totalAmount - status.filledAmount,
							side: status.side,
						};
					}
					return null;
				})
			);

			const filteredOrders = activeOrders.filter(Boolean) as {
				price: bigint;
				amount: bigint;
				side: number;
			}[];

			const buyOrders = aggregateOrders(
				filteredOrders.filter((o) => o.side === 0),
				"buy"
			);
			const sellOrders = aggregateOrders(
				filteredOrders.filter((o) => o.side === 1),
				"sell"
			);

			const bestBid = buyOrders.length > 0 ? buyOrders[0].price : null;
			const bestAsk = sellOrders.length > 0 ? sellOrders[0].price : null;

			let spread: bigint | null = null;
			let spreadPercent: number | null = null;
			if (bestBid && bestAsk) {
				spread = bestAsk - bestBid;
				spreadPercent = Number((spread * 10000n) / bestBid) / 100;
			}

			setData({
				buyOrders,
				sellOrders,
				bestBid,
				bestAsk,
				spread,
				spreadPercent,
			});
		} catch (err) {
			console.error("Error scraping order book:", err);
		} finally {
			setIsLoading(false);
		}
	}, [publicClient, orderBookAddress]);

	useEffect(() => {
		fetchOrderBook();
	}, [fetchOrderBook, blockNumber]);

	return {
		...data,
		isLoading,
		refresh: fetchOrderBook,
	};
}

function aggregateOrders(
	orders: { price: bigint; amount: bigint }[],
	side: "buy" | "sell"
): PriceLevel[] {
	const map = new Map<bigint, { amount: bigint; count: number }>();

	for (const o of orders) {
		const existing = map.get(o.price) || { amount: 0n, count: 0 };
		map.set(o.price, {
			amount: existing.amount + o.amount,
			count: existing.count + 1,
		});
	}

	const levels = Array.from(map.entries()).map(([price, val]) => ({
		price,
		amount: val.amount,
		orderCount: val.count,
		cumulativeAmount: 0n,
	}));

	levels.sort((a, b) =>
		side === "buy" ? Number(b.price - a.price) : Number(a.price - b.price)
	);

	let cumulative = 0n;
	for (const l of levels) {
		cumulative += l.amount;
		l.cumulativeAmount = cumulative;
	}

	return levels;
}
