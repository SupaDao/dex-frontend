import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/context/Web3Provider";
import Header from "@/components/layout/Header";
import { headers } from "next/headers";
import { Toaster } from "sonner";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Supadao DEX",
	description: "Premium Decentralized Exchange on Sepolia",
	icons: {
		icon: "/favicon.png",
		shortcut: "/favicon.ico",
		apple: "/favicon.png",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const headersObj = await headers();
	const cookies = headersObj.get("cookie");

	return (
		<html
			lang="en"
			className="dark"
			suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-black text-white`}>
				<Web3Provider cookies={cookies}>
					<Header />
					<div className="pt-16">{children}</div>
					<Toaster
						position="top-right"
						theme="dark"
					/>
				</Web3Provider>
			</body>
		</html>
	);
}
