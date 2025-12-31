import { useReadContracts } from "wagmi";
import { type Address, erc20Abi } from "viem";

export function useTokenDetails(address: Address | undefined) {
	const { data, isLoading, isError } = useReadContracts({
		contracts: [
			{ address, abi: erc20Abi, functionName: "name" },
			{ address, abi: erc20Abi, functionName: "symbol" },
			{ address, abi: erc20Abi, functionName: "decimals" },
		],
		query: {
			enabled: !!address && address.length === 42, // Basic length check for valid address
		},
	});

	if (!address || isLoading || isError || !data) {
		return { name: "", symbol: "", decimals: 18, isLoading, isError };
	}

	return {
		name: data[0]?.result as string,
		symbol: data[1]?.result as string,
		decimals: data[2]?.result as number, // Might be undefined if call failed
		isLoading,
		isError,
	};
}
