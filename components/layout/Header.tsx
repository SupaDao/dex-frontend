"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppKit } from "@reown/appkit/react";
import { useConnection } from "wagmi";
import { Wallet } from "lucide-react";
import Image from "next/image";

const NAV_ITEMS = [
	{ label: "Swap", href: "/swap" },
	{ label: "Pools", href: "/pools" },
	{ label: "Portfolio", href: "/portfolio" },
];

export default function Header() {
	const pathname = usePathname();
	const { open } = useAppKit();
	const { address, isConnected } = useConnection();

	return (
		<header className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-black/50 backdrop-blur-xl">
			<div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
				{/* Logo */}
				<Link
					href="/"
					className="flex items-center gap-2 group">
					<div className="w-8 h-8 relative flex items-center justify-center">
						<Image
							src="/supadao-logo.png"
							alt="Supadao logo"
							width={24}
							height={24}
						/>
					</div>
					<span className="font-bold text-xl tracking-wide text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[var(--brand-lime)] group-hover:to-[var(--brand-purple)] transition-all">
						SUPADAO
					</span>
				</Link>

				{/* Nav */}
				<nav className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5">
					{NAV_ITEMS.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
								pathname === item.href || pathname?.startsWith(item.href)
									? "text-white"
									: "text-zinc-400 hover:text-white"
							)}>
							{(pathname === item.href || pathname?.startsWith(item.href)) && (
								<motion.div
									layoutId="nav-bg"
									className="absolute inset-0 bg-white/10 rounded-full"
									transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
								/>
							)}
							<span className="relative z-10">{item.label}</span>
						</Link>
					))}
				</nav>

				{/* Wallet */}
				<button
					onClick={() => open()}
					className={cn(
						"flex items-center gap-2 border px-4 py-2 rounded-full font-medium transition-all",
						isConnected
							? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
							: "bg-[var(--brand-purple)] border-transparent hover:bg-[var(--brand-purple-dark)] text-white shadow-[0_0_15px_rgba(157,92,255,0.3)] hover:shadow-[0_0_25px_rgba(157,92,255,0.5)]"
					)}>
					{isConnected ? (
						<>
							<div className="w-2 h-2 rounded-full bg-[var(--brand-lime)] shadow-[0_0_10px_var(--brand-lime)]" />
							{truncateAddress(address)}
						</>
					) : (
						<>
							<Wallet className="w-4 h-4" />
							<span>Connect</span>
						</>
					)}
				</button>
			</div>
		</header>
	);
}

function truncateAddress(addr: string | undefined) {
	if (!addr) return "";
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
