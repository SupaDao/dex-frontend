import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, type Address } from "viem";

export function useApprove() {
	const { writeContract, data: hash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	const approve = (token: Address, spender: Address, amount: bigint) => {
		writeContract({
			address: token,
			abi: erc20Abi,
			functionName: "approve",
			args: [spender, amount],
		});
	};

	return { approve, isPending, isConfirming, isSuccess, hash, error };
}
