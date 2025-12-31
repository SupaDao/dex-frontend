"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AnimatedGrid() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <div className="fixed inset-0 z-0 bg-black" />;

	return (
		<div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black">
			{/* Grid Pattern */}
			<div
				className="absolute inset-0 opacity-[0.15]"
				style={{
					backgroundImage: `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #333 1px, transparent 1px)
          `,
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Gradient Overlay for Depth */}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

			{/* Animated Glowing Orbs */}
			<motion.div
				className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[var(--brand-purple)] blur-[120px] opacity-20"
				animate={{
					x: [0, 100, 0],
					y: [0, 50, 0],
					scale: [1, 1.1, 1],
				}}
				transition={{
					duration: 20,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>

			<motion.div
				className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[var(--brand-lime)] blur-[120px] opacity-10"
				animate={{
					x: [0, -100, 0],
					y: [0, -50, 0],
					scale: [1, 1.2, 1],
				}}
				transition={{
					duration: 25,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
		</div>
	);
}
