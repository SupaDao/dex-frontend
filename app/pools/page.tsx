import AnimatedGrid from "@/components/ui/AnimatedGrid";
import PoolsList from "@/components/pools/PoolsList";

export default function PoolsPage() {
	return (
		<main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 relative bg-black">
			<AnimatedGrid />
			<div className="relative z-10">
				<PoolsList />
			</div>
		</main>
	);
}
