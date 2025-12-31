export const COLORS = {
	// Brand Colors
	brand: {
		lime: "#DFFE00", // Vibrant Lime
		purple: "#9D5CFF", // Electric Purple
		purpleDark: "#6D28D9",
		limeDark: "#B3CC00",
	},

	// Base Colors
	background: {
		DEFAULT: "#000000",
		subtle: "#0A0A0A",
		card: "rgba(20, 20, 20, 0.6)",
		overlay: "rgba(0, 0, 0, 0.8)",
	},

	// Semantic
	state: {
		success: "#10B981",
		error: "#EF4444",
		warning: "#F59E0B",
		info: "#3B82F6",
	},

	// Text
	text: {
		primary: "#FFFFFF",
		secondary: "#A1A1AA", // zinc-400
		tertiary: "#52525B", // zinc-600
		inverse: "#000000",
	},
} as const;

export const ANIMATIONS = {
	transition: {
		default: { duration: 0.2, ease: "easeInOut" },
		slow: { duration: 0.5, ease: "easeInOut" },
		spring: { type: "spring", stiffness: 300, damping: 30 },
	},
	scale: {
		active: 0.98,
		hover: 1.02,
	},
} as const;

export const SPACING = {
	container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
	section: "py-12 sm:py-16 lg:py-20",
} as const;
