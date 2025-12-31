import { useReadContract } from "wagmi";
import { erc20Abi, type Address } from "viem";

export function useAllowance(
	token: Address | undefined,
	owner: Address | undefined,
	spender: Address | undefined
) {
	const result = useReadContract({
		address:
			token === "0x0000000000000000000000000000000000000000" ? undefined : token,
		abi: erc20Abi,
		functionName: "allowance",
		args: owner && spender ? [owner, spender] : undefined,
		query: {
			enabled:
				!!token &&
				!!owner &&
				!!spender &&
				token !== "0x0000000000000000000000000000000000000000",
		},
	});

	return {
		...result,
		refetch: result.refetch,
	};
}
