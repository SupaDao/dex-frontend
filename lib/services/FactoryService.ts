import {
	type Address,
	type PublicClient,
	type WalletClient,
	getContract,
} from "viem";
import factoryAbi from "../contracts/factory-abi.json";
import { CONTRACTS } from "../contracts/addresses";

export class FactoryService {
	private contract;

	constructor(
		private publicClient: PublicClient,
		private walletClient?: WalletClient
	) {
		this.contract = getContract({
			address: CONTRACTS.factory,
			abi: factoryAbi,
			client: {
				public: this.publicClient,
				wallet: this.walletClient,
			},
		});
	}

	private normalize(address: Address): Address {
		if (address === "0x0000000000000000000000000000000000000000") {
			// Sepolia WETH
			return "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
		}
		return address;
	}

	async getAuctionAddress(token0: Address, token1: Address): Promise<Address> {
		const t0_n = this.normalize(token0);
		const t1_n = this.normalize(token1);

		// Ensure token order for contract call
		const [t0, t1] =
			t0_n.toLowerCase() < t1_n.toLowerCase() ? [t0_n, t1_n] : [t1_n, t0_n];

		return (await this.contract.read.getAuction([t0, t1])) as Address;
	}

	async createAuction(token0: Address, token1: Address): Promise<Address> {
		if (!this.walletClient)
			throw new Error("Wallet client required for transactions");

		const t0_n = this.normalize(token0);
		const t1_n = this.normalize(token1);

		const { request } = await this.publicClient.simulateContract({
			address: CONTRACTS.factory,
			abi: factoryAbi,
			functionName: "createAuction",
			args: [t0_n, t1_n],
			account: this.walletClient.account,
		});

		const hash = await this.walletClient.writeContract(request);
		await this.publicClient.waitForTransactionReceipt({ hash });

		return await this.getAuctionAddress(token0, token1);
	}

	async getLimitOrderBookAddress(
		token0: Address,
		token1: Address
	): Promise<Address> {
		const t0_n = this.normalize(token0);
		const t1_n = this.normalize(token1);

		// Ensure token order for contract call
		const [t0, t1] =
			t0_n.toLowerCase() < t1_n.toLowerCase() ? [t0_n, t1_n] : [t1_n, t0_n];

		return (await this.contract.read.getLimitOrderBook([t0, t1])) as Address;
	}

	async createLimitOrderBook(
		token0: Address,
		token1: Address
	): Promise<Address> {
		if (!this.walletClient)
			throw new Error("Wallet client required for transactions");

		const t0_n = this.normalize(token0);
		const t1_n = this.normalize(token1);

		const { request } = await this.publicClient.simulateContract({
			address: CONTRACTS.factory,
			abi: factoryAbi,
			functionName: "createLimitOrderBook",
			args: [t0_n, t1_n],
			account: this.walletClient.account,
		});

		const hash = await this.walletClient.writeContract(request);
		await this.publicClient.waitForTransactionReceipt({ hash });

		return await this.getLimitOrderBookAddress(token0, token1);
	}
}
