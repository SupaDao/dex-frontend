import { type Address, type PublicClient, getContract } from "viem";
import batchAuctionAbi from "../contracts/batch-auction-abi.json";
import { BatchInfo } from "../types/dex";

export class BatchAuctionService {
	private contract;

	constructor(private address: Address, private publicClient: PublicClient) {
		this.contract = getContract({
			address: this.address,
			abi: batchAuctionAbi,
			client: {
				public: this.publicClient,
			},
		});
	}

	async getCurrentBatchId(): Promise<bigint> {
		return (await this.contract.read.currentBatchId()) as bigint;
	}

	async getBatchDuration(): Promise<bigint> {
		return (await this.contract.read.batchDuration()) as bigint;
	}

	async getLastBatchBlock(): Promise<bigint> {
		return (await this.contract.read.lastBatchBlock()) as bigint;
	}

	async getBatchState(batchId: bigint): Promise<number> {
		return (await this.contract.read.getBatchState([batchId])) as number;
	}

	async getBatchInfo(batchId: bigint): Promise<BatchInfo> {
		type ContractBatch = {
			startBlock: bigint;
			endBlock: bigint;
			ordersRoot: string;
			clearingPrice: bigint;
			totalVolume: bigint;
			buyVolume: bigint;
			sellVolume: bigint;
			settled: boolean;
		};

		const batch = (await this.contract.read.getBatch([batchId])) as ContractBatch;
		const state = await this.getBatchState(batchId);

		const stateMap: Record<number, "Open" | "Revealing" | "Settled"> = {
			0: "Open",
			1: "Revealing",
			2: "Settled",
		};

		return {
			batchId,
			state: stateMap[state] || "Open",
			startBlock: batch.startBlock,
			endBlock: batch.endBlock,
			clearingPrice: batch.settled ? batch.clearingPrice : null,
			totalVolume: batch.totalVolume,
			buyVolume: batch.buyVolume,
			sellVolume: batch.sellVolume,
		};
	}
}
