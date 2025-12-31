import AnimatedGrid from "@/components/ui/AnimatedGrid";
import AddLiquidityForm from "@/components/pools/AddLiquidityForm";
import { Suspense } from "react";

export default function AddLiquidityPage() {
	return (
		<main className="relative min-h-screen pt-24 pb-20 flex flex-col items-center">
			<AnimatedGrid />
			<div className="z-10 w-full px-4">
				<Suspense fallback={<div>Loading...</div>}>
					<AddLiquidityForm />
				</Suspense>
			</div>
		</main>
	);
}
