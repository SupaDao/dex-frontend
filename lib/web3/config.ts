import { cookieStorage, createStorage, http } from "wagmi";
import { sepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// Get projectId from .env
export const projectId =
	process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
	"3a8170812b534d0ff9d794f19a901d64";

if (!projectId) {
	throw new Error("Project ID is not defined");
}

export const networks = [sepolia];

// Set up Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
	storage: createStorage({
		storage: cookieStorage,
	}),
	ssr: true,
	projectId,
	networks,
});

export const config = wagmiAdapter.wagmiConfig;
