import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function extractSvgFromTokenUri(
	tokenUri: string | undefined
): string | null {
	if (!tokenUri) return null;
	// If it's already an SVG, just return it
	if (tokenUri.startsWith("data:image/svg+xml;base64,")) {
		return tokenUri;
	}
	// If it's a JSON metadata, decode it and get the 'image' field
	if (tokenUri.startsWith("data:application/json;base64,")) {
		try {
			const jsonBase64 = tokenUri.slice(tokenUri.indexOf(",") + 1);
			// Use a more robust way to handle potential unicode in the JSON
			const jsonString = decodeURIComponent(escape(window.atob(jsonBase64)));
			const json = JSON.parse(jsonString);
			return json.image || null;
		} catch (e) {
			console.error("Failed to decode tokenUri", e);
			// Try a simpler decode if the above fails
			try {
				const jsonBase64 = tokenUri.split(",")[1];
				const jsonString = atob(jsonBase64);
				const json = JSON.parse(jsonString);
				return json.image || null;
			} catch (e2) {
				return null;
			}
		}
	}
	return tokenUri; // Fallback
}
