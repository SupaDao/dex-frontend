import {
	type Address,
	type PublicClient,
	type WalletClient,
	getContract,
	type Hash,
} from "viem";
import limitOrderBookAbi from "../contracts/limit-order-book-abi.json";
import { OrderStatus } from "../types/dex";

export class LimitOrderBookService {
	private contract;

	constructor(
		private address: Address,
		private publicClient: PublicClient,
		private walletClient?: WalletClient
	) {
		this.contract = getContract({
			address: this.address,
			abi: limitOrderBookAbi,
			client: {
				public: this.publicClient,
				wallet: this.walletClient,
			},
		});
	}

	async placeOrder(
		amount: bigint,
		limitPrice: bigint,
		side: number,
		expiry: bigint,
		allowPartialFill: boolean
	): Promise<Hash> {
		if (!this.walletClient) throw new Error("Wallet client required");

		const { request } = await this.publicClient.simulateContract({
			address: this.address,
			abi: limitOrderBookAbi,
			functionName: "placeOrder",
			args: [amount, limitPrice, side, expiry, allowPartialFill],
			account: this.walletClient.account,
		});

		return await this.walletClient.writeContract(request);
	}

	async cancelOrder(orderHash: Hash): Promise<Hash> {
		if (!this.walletClient) throw new Error("Wallet client required");

		const { request } = await this.publicClient.simulateContract({
			address: this.address,
			abi: limitOrderBookAbi,
			functionName: "cancelOrder",
			args: [orderHash],
			account: this.walletClient.account,
		});

		return await this.walletClient.writeContract(request);
	}

	async getOrderStatus(orderHash: Hash): Promise<OrderStatus> {
		const status = (await this.contract.read.getOrderStatus([
			orderHash,
		])) as OrderStatus;
		return status;
	}

	async getUserOrders(user: Address): Promise<Hash[]> {
		return (await this.contract.read.getUserOrders([user])) as Hash[];
	}

	async getToken0(): Promise<Address> {
		return (await this.contract.read.token0()) as Address;
	}

	async getToken1(): Promise<Address> {
		return (await this.contract.read.token1()) as Address;
	}
}
