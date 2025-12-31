import AnimatedGrid from "@/components/ui/AnimatedGrid";
import SwapInterface from "@/components/swap/SwapInterface";

export default function SwapPage() {
	return (
		<main className="relative min-h-screen flex flex-col items-center justify-center">
			<AnimatedGrid />
			<SwapInterface />
		</main>
	);
}
