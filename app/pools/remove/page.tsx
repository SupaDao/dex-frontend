import AnimatedGrid from "@/components/ui/AnimatedGrid";
import RemoveLiquidityForm from "@/components/pools/RemoveLiquidityForm";
import { Suspense } from "react";

export default function RemoveLiquidityPage() {
	return (
		<main className="relative min-h-screen pt-24 pb-20 flex flex-col items-center">
			<AnimatedGrid />
			<div className="z-10 w-full px-4">
				<Suspense fallback={<div>Loading...</div>}>
					<RemoveLiquidityForm />
				</Suspense>
			</div>
		</main>
	);
}
