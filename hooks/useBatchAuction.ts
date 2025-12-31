import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useBlockNumber } from "wagmi";
import { type Address } from "viem";
import { BatchAuctionService } from "@/lib/services/BatchAuctionService";
import { BatchInfo } from "@/lib/types/dex";

export function useBatchAuction(auctionAddress?: Address) {
	const publicClient = usePublicClient();
	const { data: blockNumber } = useBlockNumber({ watch: true });
	const [currentBatchId, setCurrentBatchId] = useState<bigint | null>(null);
	const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
	const [batchDuration, setBatchDuration] = useState<bigint | null>(null);
	const [lastBatchBlock, setLastBatchBlock] = useState<bigint | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const fetchBatchData = useCallback(async () => {
		if (!publicClient || !auctionAddress) return;

		setIsLoading(true);
		try {
			const service = new BatchAuctionService(auctionAddress, publicClient);
			const batchId = await service.getCurrentBatchId();
			const duration = await service.getBatchDuration();
			const lastBlock = await service.getLastBatchBlock();
			const info = await service.getBatchInfo(batchId);

			setCurrentBatchId(batchId);
			setBatchDuration(duration);
			setLastBatchBlock(lastBlock);
			setBatchInfo(info);
		} catch (err) {
			console.error("Error fetching batch data:", err);
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	}, [publicClient, auctionAddress]);

	useEffect(() => {
		fetchBatchData();
	}, [fetchBatchData, blockNumber]);

	const blocksRemaining =
		blockNumber && lastBatchBlock && batchDuration
			? lastBatchBlock + batchDuration > BigInt(blockNumber)
				? lastBatchBlock + batchDuration - BigInt(blockNumber)
				: 0n
			: null;

	return {
		currentBatchId,
		batchInfo,
		batchDuration,
		blocksRemaining,
		isLoading,
		error,
		refresh: fetchBatchData,
	};
}
