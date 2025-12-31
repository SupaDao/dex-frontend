import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: [
		"pino",
		"pino-pretty",
		"thread-stream",
		"@walletconnect/logger",
		"lokijs",
		"encoding",
	],
};

export default nextConfig;
