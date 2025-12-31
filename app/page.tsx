import Link from "next/link";
import { ArrowRight, Layers, Layout, Repeat } from "lucide-react";
import AnimatedGrid from "@/components/ui/AnimatedGrid";

export default function Home() {
	return (
		<main className="relative min-h-screen flex flex-col items-center justify-center p-4">
			<AnimatedGrid />

			<div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
				{/* Hero Section */}
				<div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
					<h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 drop-shadow-2xl">
						SUPADAO
						<span className="text-[var(--brand-lime)]">.</span>
					</h1>
					<p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
						The next generation decentralized exchange on Sepolia. <br />
						<span className="text-white font-medium">Swap, Pool, and Earn</span> with
						superior efficiency.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
						<Link
							href="/swap"
							className="px-8 py-4 bg-[var(--brand-lime)] hover:bg-[var(--brand-lime)]/90 text-black text-lg font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(223,254,0,0.4)] flex items-center gap-2">
							Launch App <ArrowRight className="w-5 h-5" />
						</Link>
						<Link
							href="/pools"
							className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-lg font-bold rounded-full border border-white/10 transition-all hover:scale-105 backdrop-blur-sm">
							View Pools
						</Link>
					</div>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
					<FeatureCard
						icon={<Repeat className="w-8 h-8 text-[var(--brand-lime)]" />}
						title="Instant Swaps"
						description="Trade any ERC20 token instantly with optimized routing and minimal slippage."
						delay={0.1}
					/>
					<FeatureCard
						icon={<Layers className="w-8 h-8 text-[var(--brand-purple)]" />}
						title="Concentrated Liquidity"
						description="Maximize your capital efficiency by providing liquidity in custom price ranges."
						delay={0.2}
					/>
					<FeatureCard
						icon={<Layout className="w-8 h-8 text-blue-400" />}
						title="Pro Dashboard"
						description="Track your portfolio performance and manage positions from a single interface."
						delay={0.3}
					/>
				</div>
			</div>
		</main>
	);
}

function FeatureCard({
	icon,
	title,
	description,
	delay,
}: {
	icon: any;
	title: string;
	description: string;
	delay: number;
}) {
	return (
		<div
			className="glass-panel p-8 rounded-3xl hover:bg-white/10 transition-colors animate-in fade-in slide-in-from-bottom-5 fill-mode-backwards"
			style={{ animationDelay: `${delay}s` }}>
			<div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
				{icon}
			</div>
			<h3 className="text-xl font-bold text-white mb-3">{title}</h3>
			<p className="text-zinc-400 leading-relaxed">{description}</p>
		</div>
	);
}
