"use client";

import { wagmiAdapter, projectId } from "@/lib/web3/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { sepolia } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

// Set up query client
const queryClient = new QueryClient();

if (!projectId) {
	throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
	name: "Supadao",
	description: "Supadao DEX - Decentralized Exchange",
	url: "https://supadao.com", // TODO: Update with actual URL when deployed
	icons: ["https://supadao.com/logo.png"], // TODO: Update with actual logo URL
};

// Create modal
const modal = createAppKit({
	adapters: [wagmiAdapter],
	projectId,
	networks: [sepolia],
	defaultNetwork: sepolia,
	metadata: metadata,
	features: {
		analytics: true,
		email: false,
		socials: [],
	},
	themeMode: "dark",
	themeVariables: {
		"--w3m-accent": "#DFFE00", // Brand Lime
		"--w3m-border-radius-master": "1px",
		"--w3m-font-family": "var(--font-geist-sans)",
	},
});

export default function Web3Provider({
	children,
	cookies,
}: {
	children: ReactNode;
	cookies: string | null;
}) {
	const initialState = cookieToInitialState(
		wagmiAdapter.wagmiConfig as Config,
		cookies
	);

	return (
		<WagmiProvider
			config={wagmiAdapter.wagmiConfig as Config}
			initialState={initialState}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	);
}
