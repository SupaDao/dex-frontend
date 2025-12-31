import { useBalance, useReadContract } from "wagmi";
import { type Address, erc20Abi } from "viem";

export function useTokenBalance(
	tokenAddress: Address | undefined,
	walletAddress: Address | undefined
) {
	const isNative =
		!tokenAddress ||
		tokenAddress === "0x0000000000000000000000000000000000000000";

	// 1. Native Balance
	const { data: nativeBalance, refetch: refetchNative } = useBalance({
		address: walletAddress,
		query: {
			enabled: isNative && !!walletAddress,
		},
	});

	// 2. ERC20 Balance
	const { data: erc20Balance, refetch: refetchERC20 } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: walletAddress ? [walletAddress] : undefined,
		query: {
			enabled: !isNative && !!walletAddress && !!tokenAddress,
		},
	});

	// 3. ERC20 Decimals
	const { data: decimals } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "decimals",
		query: {
			enabled: !isNative && !!tokenAddress,
		},
	});

	if (isNative) {
		return { data: nativeBalance, refetch: refetchNative };
	}

	return {
		data:
			erc20Balance !== undefined && decimals !== undefined
				? {
						value: erc20Balance,
						decimals: decimals,
						formatted: "", // We can compute if needed, but UI seems to do it manually using formatUnits
						symbol: "", // UI uses token.symbol
				  }
				: undefined,
		refetch: refetchERC20,
	};
}
