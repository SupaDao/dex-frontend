import AnimatedGrid from "@/components/ui/AnimatedGrid";
import WalletOverview from "@/components/portfolio/WalletOverview";
import PositionsList from "@/components/portfolio/PositionsList";

export default function PortfolioPage() {
	return (
		<main className="relative min-h-screen pt-24 px-4 pb-12">
			<AnimatedGrid />

			<div className="max-w-4xl mx-auto space-y-8 relative z-10">
				<h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

				<WalletOverview />
				<PositionsList />
			</div>
		</main>
	);
}
