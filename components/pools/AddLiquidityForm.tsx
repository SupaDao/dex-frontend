/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useConnection } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { parseUnits, formatUnits } from "viem";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Info, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { TokenSelector } from "@/components/swap/TokenSelector";
import {
	TOKENS,
	Token,
	getDisplaySymbol,
	getTokenByAddress,
} from "@/lib/contracts/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useMintPosition } from "@/hooks/useMintPosition";
import { useApprove } from "@/hooks/useApprove";
import { useAllowance } from "@/hooks/useAllowance";
import { usePoolAddress } from "@/hooks/usePoolAddress";
import { useCreatePool } from "@/hooks/useCreatePool";
import { useInitializePool } from "@/hooks/useInitializePool";
import { usePoolState } from "@/hooks/usePoolState";
import { usePositions } from "@/hooks/usePositions";
import { usePools } from "@/hooks/usePools";
import { usePoolInfo } from "@/hooks/usePoolInfo";
import { useTokenDetails } from "@/hooks/useTokenDetails";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { cn } from "@/lib/utils";
import { type Address } from "viem";
import {
	getTickAtPrice,
	getSqrtRatioAtTick,
	getPriceFromTick,
	getLiquidityForAmounts,
} from "@/lib/web3/liquidityMath";
import PriceGapChart from "./PriceGapChart";
import TransactionProgressModal, {
	TransactionStatus,
} from "./TransactionProgressModal";

const FEE_TIERS = [
	{ value: 100, label: "0.01%", desc: "Best for very stable pairs", spacing: 2 },
	{ value: 500, label: "0.05%", desc: "Best for stable pairs", spacing: 10 },
	{ value: 3000, label: "0.3%", desc: "Best for most pairs", spacing: 60 },
	{ value: 10000, label: "1%", desc: "Best for exotic pairs", spacing: 200 },
];

interface AddLiquidityFormProps {
	tokenId?: string;
	onClose?: () => void;
	onSuccess?: () => void;
}

export default function AddLiquidityForm({
	tokenId,
	onClose,
	onSuccess,
}: AddLiquidityFormProps = {}) {
	const { address, isConnected } = useConnection();
	const { open } = useAppKit();
	const router = useRouter();

	const [token0, setToken0] = useState<Token | undefined>(TOKENS[0]); // Default to ETH
	const [token1, setToken1] = useState<Token | undefined>(undefined);
	const [feeTier, setFeeTier] = useState(3000);
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");

	// Derived tick spacing based on fee tier
	const currentTickSpacing =
		FEE_TIERS.find((t) => t.value === feeTier)?.spacing || 60;

	// 1. Factory Check
	const {
		data: poolAddress,
		isLoading: isPoolAddressLoading,
		refetch: refetchPoolAddress,
	} = usePoolAddress(token0?.address, token1?.address, feeTier);

	// Pool existence check
	const isPoolExists =
		poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000";

	// 2. Pool State Check
	const {
		data: slot0,
		isLoading: isPoolStateLoading,
		refetch: refetchPoolState,
	} = usePoolState(isPoolExists ? poolAddress : undefined);

	// slot0: [sqrtPriceX96, tick, ...]
	const isInitialized = slot0 ? slot0[0] > 0n : false;
	const currentTick = slot0 ? slot0[1] : undefined;

	// Calculate Price from Tick if initialized
	const poolCurrentPrice =
		isInitialized && currentTick !== undefined
			? getPriceFromTick(currentTick)
			: undefined;

	// Finding existing position if tokenId is provided
	const { positions, refetch: refetchPositions } = usePositions();
	const { pools, refetch: refetchPools } = usePools();

	const existingPosition: any = React.useMemo(() => {
		if (!tokenId) return null;
		return positions.find((p) => p.tokenId.toString() === tokenId);
	}, [positions, tokenId]);

	// Calculate positions in the current pool (for detection UI)
	const poolPositions = React.useMemo(() => {
		if (!poolAddress || !positions.length) return [];
		return positions.filter(
			(p: any) => p.pool && p.pool.toLowerCase() === poolAddress.toLowerCase()
		);
	}, [poolAddress, positions]);

	const isIncreaseMode = !!tokenId;

	// Enhanced fetching for increase mode (custom pools)
	const {
		token0: t0Addr,
		token1: t1Addr,
		fee: poolFee,
	} = usePoolInfo(existingPosition?.pool as Address);
	const t0Details = useTokenDetails(t0Addr);
	const t1Details = useTokenDetails(t1Addr);

	// Auto-fill from existing position
	useEffect(() => {
		if (existingPosition && pools) {
			const pool = pools.find(
				(p) => p.address.toLowerCase() === existingPosition.pool.toLowerCase()
			);

			// Helper to check if address is WETH
			const isWETH = (addr: string) => {
				const weth = TOKENS.find((t) => t.symbol === "WETH");
				return weth && addr.toLowerCase() === weth.address.toLowerCase();
			};

			if (pool) {
				// Check if pool tokens are WETH and map to Native if needed
				// For token0
				if (token0?.address !== pool.token0.address) {
					if (isWETH(pool.token0.address)) {
						setToken0(TOKENS[0]); // Set to Native ETH
					} else {
						setToken0(pool.token0);
					}
				}
				// For token1
				if (token1?.address !== pool.token1.address) {
					if (isWETH(pool.token1.address)) {
						setToken1(TOKENS[0]); // Set to Native ETH
					} else {
						setToken1(pool.token1);
					}
				}

				if (feeTier !== (pool.fee || 3000)) setFeeTier(pool.fee || 3000);
			} else if (t0Addr && t1Addr) {
				// Use hooks for custom pools
				const isT0WETH = isWETH(t0Addr);
				const isT1WETH = isWETH(t1Addr);

				if (isT0WETH) {
					setToken0(TOKENS[0]);
				} else if (token0?.address !== t0Addr) {
					setToken0({
						address: t0Addr,
						symbol: getDisplaySymbol(
							getTokenByAddress(t0Addr)?.symbol ||
								t0Details.symbol ||
								t0Addr.slice(0, 6),
							t0Addr
						),
						name: t0Details.name || "",
						decimals: t0Details.decimals || 18,
					});
				}

				if (isT1WETH) {
					setToken1(TOKENS[0]);
				} else if (token1?.address !== t1Addr) {
					setToken1({
						address: t1Addr,
						symbol: getDisplaySymbol(
							getTokenByAddress(t1Addr)?.symbol ||
								t1Details.symbol ||
								t1Addr.slice(0, 6),
							t1Addr
						),
						name: t1Details.name || "",
						decimals: t1Details.decimals || 18,
					});
				}

				if (feeTier !== (poolFee || 3000)) setFeeTier(poolFee || 3000);
			}

			const newMin = getPriceFromTick(existingPosition.tickLower).toString();
			const newMax = getPriceFromTick(existingPosition.tickUpper).toString();

			if (minPrice !== newMin) setMinPrice(newMin);
			if (maxPrice !== newMax) setMaxPrice(newMax);
		}
	}, [
		existingPosition,
		pools,
		t0Addr,
		t1Addr,
		t0Details.symbol,
		t0Details.decimals,
		t1Details.symbol,
		t1Details.decimals,
		poolFee,
		token0?.address,
		token1?.address,
		feeTier,
		minPrice,
		maxPrice,
		t0Details.name,
		t1Details.name,
	]);

	// Inputs
	const [amount0, setAmount0] = useState("");
	const [amount1, setAmount1] = useState("");
	const [startPrice, setStartPrice] = useState(""); // For initialization

	const [isFullRange, setIsFullRange] = useState(false);

	const [isToken0SelectorOpen, setIsToken0SelectorOpen] = useState(false);
	const [isToken1SelectorOpen, setIsToken1SelectorOpen] = useState(false);

	const isInvalidPair = React.useMemo(() => {
		if (!token0 || !token1) return false;
		const weth = TOKENS.find((t) => t.symbol === "WETH");
		if (!weth) return false;

		const is0Native =
			token0.address === "0x0000000000000000000000000000000000000000";
		const is1Native =
			token1.address === "0x0000000000000000000000000000000000000000";
		const is0Weth = token0.address.toLowerCase() === weth.address.toLowerCase();
		const is1Weth = token1.address.toLowerCase() === weth.address.toLowerCase();

		return (is0Native && is1Weth) || (is0Weth && is1Native);
	}, [token0, token1]);

	// Auto-Calculation Helpers
	// Effective price is either the live pool price OR the user's starting price
	const effectivePrice =
		poolCurrentPrice ?? (startPrice ? parseFloat(startPrice) : undefined);

	const handleAmount0Change = (val: string) => {
		setAmount0(val);
		if (
			!val ||
			isNaN(parseFloat(val)) ||
			!effectivePrice ||
			isNaN(effectivePrice)
		) {
			return;
		}

		const valNum = parseFloat(val);

		// If pool is initialized and we have a range, use the precise ratio
		if (isInitialized && targetRange && effectivePrice > 0) {
			const { tickLower, tickUpper } = targetRange;
			const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
			const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
			const sqrtRatioCurrentX96 = slot0![0];

			// Ratio of amount1 / amount0
			// amount1 = L * (sqrt(P) - sqrt(Pa))
			// amount0 = L * (sqrt(Pb) - sqrt(P)) / (sqrt(Pb) * sqrt(P))
			// ratio = (sqrt(P) - sqrt(Pa)) * sqrt(Pb) * sqrt(P) / (sqrt(Pb) - sqrt(P))

			const sqrtP = Number(sqrtRatioCurrentX96) / 2 ** 96;
			const sqrtPa = Number(sqrtRatioAX96) / 2 ** 96;
			const sqrtPb = Number(sqrtRatioBX96) / 2 ** 96;

			if (sqrtP <= sqrtPa) {
				setAmount1("0"); // Only Token0 needed
			} else if (sqrtP >= sqrtPb) {
				// Only Token1 needed, but we entered Amount0. This shouldn't happen if UI is correct,
				// but let's handle it by saying amount0 is invalid or just setting amount1 to 0.
				// Actually if P > Pb, only Token1 is provided.
			} else {
				const ratio = ((sqrtP - sqrtPa) * sqrtPb * sqrtP) / (sqrtPb - sqrtP);
				const expectedAmount1 = valNum * ratio;
				setAmount1(expectedAmount1.toFixed(6));
			}
		} else {
			// Fallback to simple price ratio
			const expectedAmount1 = valNum * effectivePrice;
			setAmount1(expectedAmount1.toFixed(6));
		}
	};

	const handleAmount1Change = (val: string) => {
		setAmount1(val);
		if (
			!val ||
			isNaN(parseFloat(val)) ||
			!effectivePrice ||
			isNaN(effectivePrice) ||
			effectivePrice === 0
		) {
			return;
		}

		const valNum = parseFloat(val);

		// If pool is initialized and we have a range, use the precise ratio
		if (isInitialized && targetRange && effectivePrice > 0) {
			const { tickLower, tickUpper } = targetRange;
			const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
			const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
			const sqrtRatioCurrentX96 = slot0![0];

			const sqrtP = Number(sqrtRatioCurrentX96) / 2 ** 96;
			const sqrtPa = Number(sqrtRatioAX96) / 2 ** 96;
			const sqrtPb = Number(sqrtRatioBX96) / 2 ** 96;

			if (sqrtP <= sqrtPa) {
				// Only Token0 needed
			} else if (sqrtP >= sqrtPb) {
				setAmount0("0"); // Only Token1 needed
			} else {
				const ratio = ((sqrtP - sqrtPa) * sqrtPb * sqrtP) / (sqrtPb - sqrtP);
				const expectedAmount0 = valNum / ratio;
				setAmount0(expectedAmount0.toFixed(6));
			}
		} else {
			const expectedAmount0 = valNum / effectivePrice;
			setAmount0(expectedAmount0.toFixed(6));
		}
	};

	// Transaction Hooks
	const {
		createPool,
		isPending: isCreatePending,
		isSuccess: isCreateSuccess,
		error: createError,
	} = useCreatePool();

	const {
		initializePool,
		isPending: isInitPending,
		isSuccess: isInitSuccess,
		error: initError,
	} = useInitializePool();

	const {
		mint,
		increaseLiquidity,
		isPending: isMintPending,
		isConfirming,
		isSuccess: isMintSuccess,
		error: mintError,
		receipt: mintReceipt,
	} = useMintPosition();

	const {
		approve: approve0,
		isPending: isApprove0Pending,
		isSuccess: isApprove0Success,
		error: approve0Error,
	} = useApprove();

	const {
		approve: approve1,
		isPending: isApprove1Pending,
		isSuccess: isApprove1Success,
		error: approve1Error,
	} = useApprove();

	// Tx State for Modal
	const [txStatus, setTxStatus] = useState<TransactionStatus>("idle");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");

	// Flags for the modal flow
	const [needsCreate, setNeedsCreate] = useState(false);
	const [needsInitialize, setNeedsInitialize] = useState(false);
	const [needsApproval0, setNeedsApproval0] = useState(false);
	const [needsApproval1, setNeedsApproval1] = useState(false);

	// Balances & Allowances
	const { data: balance0 } = useTokenBalance(token0?.address, address);
	const { data: balance1 } = useTokenBalance(token1?.address, address);

	const { data: allowance0, refetch: refetchAllowance0 } = useAllowance(
		token0?.address,
		address,
		CONTRACTS.positionNFT
	);
	const { data: allowance1, refetch: refetchAllowance1 } = useAllowance(
		token1?.address,
		address,
		CONTRACTS.positionNFT
	);

	const [isApproved0Local, setIsApproved0Local] = useState(false);
	const [isApproved1Local, setIsApproved1Local] = useState(false);
	const [isApprovingInProgress, setIsApprovingInProgress] = useState(false);
	const [hasExecutedMint, setHasExecutedMint] = useState(false);

	// Ref to prevent double initialization
	const hasAttemptedInitRef = React.useRef(false);

	// Reset local approval state on token change
	useEffect(() => {
		setIsApproved0Local(false);
		setIsApproved1Local(false);
		setIsApprovingInProgress(false);
		setHasExecutedMint(false);
		hasAttemptedInitRef.current = false;
	}, [token0, token1]);

	const amount0Wei = parseUnits(amount0 || "0", token0?.decimals || 18);
	const amount1Wei = parseUnits(amount1 || "0", token1?.decimals || 18);

	// Derived Max Amounts with Slippage (used for both Approval and Minting)
	const SLIPPAGE_NUMERATOR = 103n;
	const SLIPPAGE_DENOMINATOR = 100n;

	const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

	let amount0Max = (amount0Wei * SLIPPAGE_NUMERATOR) / SLIPPAGE_DENOMINATOR;
	let amount1Max = (amount1Wei * SLIPPAGE_NUMERATOR) / SLIPPAGE_DENOMINATOR;

	// Safety check: Cap amountMax to balance for ALL tokens to avoid SafeTransferFrom failure
	if (balance0 && amount0Max > balance0.value) {
		amount0Max = balance0.value;
	}
	if (balance1 && amount1Max > balance1.value) {
		amount1Max = balance1.value;
	}

	// Re-calculate approval needs on every render or state change
	const checkNeedsApproval0 =
		token0?.address !== NATIVE_ADDRESS &&
		allowance0 !== undefined &&
		allowance0 < amount0Max &&
		amount0Max > 0n &&
		!isApproved0Local &&
		!isApprovingInProgress;
	const checkNeedsApproval1 =
		token1?.address !== NATIVE_ADDRESS &&
		allowance1 !== undefined &&
		allowance1 < amount1Max &&
		amount1Max > 0n &&
		!isApproved1Local &&
		!isApprovingInProgress;

	const isPending =
		isCreatePending ||
		isInitPending ||
		isMintPending ||
		isApprove0Pending ||
		isApprove1Pending ||
		isConfirming;

	// Calculate target ticks for matching and execution
	const targetRange = React.useMemo(() => {
		if (!token0 || !token1) return undefined;
		const MIN_TICK = -887272;
		const MAX_TICK = 887272;

		let tickLower, tickUpper;

		if (isFullRange) {
			const lowerBase =
				Math.ceil(MIN_TICK / currentTickSpacing) * currentTickSpacing;
			const upperBase =
				Math.floor(MAX_TICK / currentTickSpacing) * currentTickSpacing;
			tickLower = lowerBase;
			tickUpper = upperBase;
		} else {
			const min = parseFloat(minPrice);
			const max = parseFloat(maxPrice);
			if (isNaN(min) || isNaN(max) || !min || !max) return undefined;

			const tickA = getTickAtPrice(min);
			const tickB = getTickAtPrice(max);
			tickLower = Math.min(tickA, tickB);
			tickUpper = Math.max(tickA, tickB);

			tickLower = Math.floor(tickLower / currentTickSpacing) * currentTickSpacing;
			tickUpper = Math.floor(tickUpper / currentTickSpacing) * currentTickSpacing;
		}

		if (tickLower < MIN_TICK)
			tickLower = Math.ceil(MIN_TICK / currentTickSpacing) * currentTickSpacing;
		if (tickUpper > MAX_TICK)
			tickUpper = Math.floor(MAX_TICK / currentTickSpacing) * currentTickSpacing;

		if (tickLower >= tickUpper) tickUpper = tickLower + currentTickSpacing;

		return { tickLower, tickUpper };
	}, [token0, token1, isFullRange, currentTickSpacing, minPrice, maxPrice]);

	// Find matching existing position
	const matchingPosition: any = React.useMemo(() => {
		if (!poolAddress || !targetRange || !positions.length || !token0 || !token1)
			return undefined;

		// Note: The position in contract is always token0 < token1.
		// Our targetRange is from UI (might be inverted).
		// We need to normalize targetRange to pool coordinates for matching.
		const isSorted = token0.address.toLowerCase() < token1.address.toLowerCase();
		let tickLowerPool = targetRange.tickLower;
		let tickUpperPool = targetRange.tickUpper;

		if (!isSorted) {
			tickLowerPool = -targetRange.tickUpper;
			tickUpperPool = -targetRange.tickLower;
		}

		return positions.find(
			(p: any) =>
				p.pool.toLowerCase() === poolAddress.toLowerCase() &&
				Number(p.tickLower) === tickLowerPool &&
				Number(p.tickUpper) === tickUpperPool
		);
	}, [poolAddress, targetRange, positions, token0, token1]);

	// Helper to actually mint or increase
	const executeMint = React.useCallback(() => {
		if (!token0 || !token1 || !targetRange) return;

		// Final sanity check for approvals
		if (checkNeedsApproval0 && !isApprovingInProgress) {
			setTxStatus("approving_0");
			setIsApprovingInProgress(true);
			approve0(token0.address, CONTRACTS.positionNFT, amount0Max);
			return;
		}
		if (checkNeedsApproval1 && !isApprovingInProgress) {
			setTxStatus("approving_1");
			setIsApprovingInProgress(true);
			approve1(token1.address, CONTRACTS.positionNFT, amount1Max);
			return;
		}

		if (hasExecutedMint) return;
		setTxStatus(
			existingPosition || matchingPosition ? "increasing_liquidity" : "minting"
		);
		setHasExecutedMint(true);

		try {
			const { tickLower, tickUpper } = targetRange;

			// Calculate Liquidity (L)
			const currentSqrtPriceX96 = slot0 ? slot0[0] : 0n;
			if (currentSqrtPriceX96 === 0n) {
				throw new Error("Pool price data missing. Please try again.");
			}

			// Normalize to Pool Coordinates for Liquidity Math (Token0 < Token1)
			const isSorted = token0.address.toLowerCase() < token1.address.toLowerCase();
			const amount0Pool = isSorted ? amount0Wei : amount1Wei;
			const amount1Pool = isSorted ? amount1Wei : amount0Wei;

			let tickLowerPool = tickLower;
			let tickUpperPool = tickUpper;

			if (!isSorted) {
				tickLowerPool = -tickUpper;
				tickUpperPool = -tickLower;
			}

			const sqrtRatioAX96 = getSqrtRatioAtTick(tickLowerPool);
			const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpperPool);

			let liquidity = getLiquidityForAmounts(
				currentSqrtPriceX96,
				sqrtRatioAX96,
				sqrtRatioBX96,
				amount0Pool,
				amount1Pool
			);

			liquidity = (liquidity * 995n) / 1000n;

			if (liquidity === 0n) {
				throw new Error("Calculated liquidity is zero. Amounts may be too small.");
			}

			const posToIncrease = existingPosition || matchingPosition;

			if (posToIncrease) {
				increaseLiquidity(
					posToIncrease.tokenId,
					token0.address,
					token1.address,
					liquidity,
					amount0Max,
					amount1Max
				);
			} else {
				mint(
					token0.address,
					token1.address,
					feeTier,
					tickLower,
					tickUpper,
					liquidity,
					amount0Max,
					amount1Max,
					address!
				);
			}
		} catch (err: any) {
			console.error(err);
			setTxStatus("error");
			setErrorMsg(err.message || "Execution failed");
		}
	}, [
		token0,
		token1,
		targetRange,
		checkNeedsApproval0,
		isApprovingInProgress,
		checkNeedsApproval1,
		approve0,
		amount0Max,
		approve1,
		amount1Max,
		existingPosition,
		matchingPosition,
		slot0,
		amount0Wei,
		amount1Wei,
		increaseLiquidity,
		mint,
		feeTier,
		address,
		hasExecutedMint,
	]);

	// Explicit Initialize Function
	const executeInitialize = useCallback(() => {
		if (!poolAddress || !startPrice || !token0 || !token1) return;

		// Prevent duplicate initialization calls
		if (hasAttemptedInitRef.current) {
			console.log("Skipping duplicate initialization attempt");
			return;
		}

		let price = parseFloat(startPrice);
		if (isNaN(price) || price <= 0) {
			toast.error("Invalid start price");
			return;
		}

		const sorted = token0.address.toLowerCase() < token1.address.toLowerCase();
		if (!sorted) {
			price = 1 / price;
		}

		const tick = getTickAtPrice(price);
		const sqrtPriceX96 = getSqrtRatioAtTick(tick);

		hasAttemptedInitRef.current = true;
		initializePool(poolAddress, sqrtPriceX96);
	}, [initializePool, poolAddress, startPrice, token0, token1]);

	// Main Handler
	const handleUnifiedFlow = () => {
		if (!token0 || !token1) return;

		// 1. Determine Needs
		const _needsCreate = !isPoolExists;
		const _needsInit = !isInitialized;

		setNeedsCreate(_needsCreate);
		setNeedsInitialize(_needsInit);
		setNeedsApproval0(checkNeedsApproval0);
		setNeedsApproval1(checkNeedsApproval1);

		setErrorMsg("");
		setIsModalOpen(true);

		// Reset initialization ref for new flow
		if (_needsCreate || _needsInit) {
			hasAttemptedInitRef.current = false;
		}

		// 2. Start Logic
		if (_needsCreate) {
			setTxStatus("creating_pool");
			createPool(token0.address, token1.address, feeTier);
		} else if (_needsInit) {
			setTxStatus("initializing_pool");
		} else {
			executeMint();
		}
	};

	// Effect Chains

	// Effect: Watch Create Pool Success
	useEffect(() => {
		if (isCreateSuccess && txStatus === "creating_pool") {
			setTxStatus("initializing_pool");
			refetchPoolAddress();
		}
	}, [isCreateSuccess, txStatus, refetchPoolAddress]);

	// Polling for pool address and state when initializing
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (
			txStatus === "initializing_pool" &&
			(!poolAddress ||
				poolAddress === "0x0000000000000000000000000000000000000000")
		) {
			interval = setInterval(() => {
				refetchPoolAddress();
			}, 2000);
		}
		return () => clearInterval(interval);
	}, [txStatus, poolAddress, refetchPoolAddress]);

	// Polling for slot0 when we have address but no state yet
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (
			txStatus === "initializing_pool" &&
			poolAddress &&
			poolAddress !== "0x0000000000000000000000000000000000000000" &&
			!slot0
		) {
			interval = setInterval(() => {
				refetchPoolState?.();
			}, 2000);
		}
		return () => clearInterval(interval);
	}, [txStatus, poolAddress, slot0, refetchPoolState]);

	// 2. Trigger Init when ready
	useEffect(() => {
		if (
			txStatus === "initializing_pool" &&
			poolAddress &&
			poolAddress !== "0x0000000000000000000000000000000000000000" &&
			!isPoolStateLoading
		) {
			if (!slot0) {
				return;
			}
			if (slot0[0] > 0n) {
				executeMint();
				return;
			}
			if (!isInitPending && !isInitSuccess) {
				executeInitialize();
			}
		}
	}, [
		txStatus,
		poolAddress,
		isInitPending,
		isInitSuccess,
		isPoolStateLoading,
		slot0,
		executeMint,
		executeInitialize,
	]);

	// 3. Watch Init Success
	useEffect(() => {
		if (isInitSuccess && txStatus === "initializing_pool") {
			refetchPoolState?.().then(() => {
				executeMint();
			});
		}
	}, [isInitSuccess, txStatus, refetchPoolState, executeMint]);

	// 4. Watch Approve 0 Success
	useEffect(() => {
		if (isApprove0Success && txStatus === "approving_0") {
			setIsApproved0Local(true);
			setIsApprovingInProgress(false);
			toast.success("Token A approved!");
			refetchAllowance0().then(() => {
				// Move to next step automatically
				if (checkNeedsApproval1 && !isApproved1Local) {
					setTxStatus("approving_1");
				} else {
					setTxStatus("minting");
				}
			});
		}
	}, [
		isApprove0Success,
		txStatus,
		checkNeedsApproval1,
		isApproved1Local,
		refetchAllowance0,
	]);

	// 5. Watch Approve 1 Success
	useEffect(() => {
		if (isApprove1Success && txStatus === "approving_1") {
			setIsApproved1Local(true);
			setIsApprovingInProgress(false);
			toast.success("Token B approved!");
			refetchAllowance1().then(() => {
				setTxStatus("minting");
			});
		}
	}, [isApprove1Success, txStatus, refetchAllowance1]);

	// Auto-execute minting when status changes to 'minting'
	useEffect(() => {
		if (txStatus === "minting" && !isPending && !isConfirming && !isMintSuccess) {
			executeMint();
		}
	}, [txStatus, isPending, isConfirming, isMintSuccess, executeMint]);

	// 6. Watch Mint Success
	useEffect(() => {
		if (isMintSuccess) {
			setTxStatus("success");
			toast.success("Liquidity added successfully!");

			// Force immediate refetch
			refetchPositions();
			refetchPools();
			refetchPoolState?.();
			refetchAllowance0();
			refetchAllowance1();

			// Notify parent (e.g. for refetching in PoolDetails)
			onSuccess?.();

			// Redirect to pool details after a short delay
			if (poolAddress) {
				setTimeout(() => {
					router.push(`/pools/${poolAddress}`);
				}, 2000);
			}
		}
	}, [isMintSuccess, poolAddress, router]);

	// 7. Watch Errors
	useEffect(() => {
		const err =
			createError || initError || approve0Error || approve1Error || mintError;
		if (err) {
			setTxStatus("error");
			setErrorMsg(err.message);
		}
	}, [createError, initError, approve0Error, approve1Error, mintError]);

	// 8. Watch Receipt Revert (Fix for infinite spinner)
	useEffect(() => {
		if (mintReceipt?.status === "reverted") {
			setTxStatus("error");
			setErrorMsg(
				"Transaction reverted on chain. Likely due to slippage or insufficient allowance."
			);
		}
	}, [mintReceipt]);

	return (
		<div className="relative w-full container mx-auto">
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center gap-4">
					{!onClose && (
						<Link
							href="/pools"
							className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
							<ArrowLeft className="w-5 h-5" />
						</Link>
					)}
					<div>
						<h2 className="text-2xl font-bold text-white">
							{isIncreaseMode ? "Increase Liquidity" : "Add Liquidity"}
						</h2>
						<p className="text-zinc-500 text-xs">
							{isIncreaseMode
								? `Add more to position #${tokenId}`
								: "Create a new position or add to an existing pool"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{!isIncreaseMode && (
						<>
							<button className="p-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white">
								<Info className="w-5 h-5" />
							</button>
							<button className="p-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white">
								<Settings className="w-5 h-5" />
							</button>
						</>
					)}
					{onClose && (
						<button
							onClick={onClose}
							className="p-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white">
							<X className="w-5 h-5" />
						</button>
					)}
				</div>
			</div>

			<div
				className={cn(
					"grid grid-cols-1 gap-8",
					!onClose && "lg:grid-cols-[1fr_400px]"
				)}>
				<div className="px-6 pb-6 space-y-5">
					{!isIncreaseMode && (
						<div className="bg-[#0A0A0A] rounded-[24px] border border-white/5 p-6">
							<h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">
								Select Pair
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<button
									onClick={() => setIsToken0SelectorOpen(true)}
									className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
									<div className="flex items-center gap-3">
										{token0 ? (
											<>
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-xs font-bold border border-indigo-500/50">
													{token0.symbol[0]}
												</div>
												<span className="font-bold text-lg">{token0.symbol}</span>
											</>
										) : (
											<span className="text-zinc-500 font-medium">Select Token</span>
										)}
									</div>
									<ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
								</button>
								<button
									onClick={() => setIsToken1SelectorOpen(true)}
									className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
									<div className="flex items-center gap-3">
										{token1 ? (
											<>
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-xs font-bold border border-purple-500/50">
													{token1.symbol[0]}
												</div>
												<span className="font-bold text-lg">{token1.symbol}</span>
											</>
										) : (
											<span className="text-zinc-500 font-medium">Select Token</span>
										)}
									</div>
									<ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
								</button>
							</div>
						</div>
					)}

					{!isIncreaseMode && (
						<div className="bg-[#0A0A0A] rounded-[24px] border border-white/5 p-6">
							<h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">
								Select Fee Tier
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{FEE_TIERS.map((tier) => (
									<button
										key={tier.value}
										onClick={() => setFeeTier(tier.value)}
										className={cn(
											"p-4 rounded-3xl border transition-all text-left space-y-1",
											feeTier === tier.value
												? "bg-[var(--brand-lime)]/10 border-[var(--brand-lime)]/50"
												: "bg-white/5 border-white/5 hover:border-white/10"
										)}>
										<p
											className={cn(
												"font-bold",
												feeTier === tier.value ? "text-[var(--brand-lime)]" : "text-white"
											)}>
											{tier.label}
										</p>
										<p className="text-[10px] text-zinc-500 leading-tight">{tier.desc}</p>
									</button>
								))}
							</div>
						</div>
					)}

					{token0 && token1 && !isPoolAddressLoading && (
						<div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm flex gap-3 items-start">
							<Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
							<div>
								{!isPoolExists ? (
									<p>
										This pool doesn&apos;t exist yet. It will be created automatically.
									</p>
								) : !isInitialized ? (
									<p>
										This pool created but not initialized. You need to set the starting
										price.
									</p>
								) : (
									<p>
										Pool exists and is active. Current Price:{" "}
										<span className="font-bold text-white">
											{poolCurrentPrice?.toFixed(6)} {token1.symbol}/{token0.symbol}
										</span>
									</p>
								)}
							</div>
						</div>
					)}

					{!isIncreaseMode &&
						token0 &&
						token1 &&
						isPoolExists &&
						poolPositions.length > 0 && (
							<div className="bg-[#0A0A0A] rounded-[24px] border border-white/5 p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-[10px] font-bold text-white uppercase tracking-widest">
										Your Existing Positions
									</h3>
									<span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full">
										{poolPositions.length} position{poolPositions.length > 1 ? "s" : ""}
									</span>
								</div>
								<p className="text-sm text-zinc-400 mb-4">
									You have existing position(s) in this pool. You can increase liquidity
									on an existing position or create a new one.
								</p>
								<div className="space-y-3">
									{poolPositions.map((pos: any) => {
										// const posPool = pools.find( // This line was commented out in the original, keeping it that way
										// 	(p) => p.address.toLowerCase() === pos.pool.toLowerCase()
										// );
										return (
											<div
												key={pos.tokenId.toString()}
												className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
												<div className="flex items-center justify-between">
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-2">
															<span className="text-xs font-mono text-zinc-500">
																Position #{pos.tokenId.toString()}
															</span>
															<span
																className={cn(
																	"text-[10px] px-2 py-0.5 rounded-full font-medium",
																	Number(pos.liquidity) > 0
																		? "bg-green-500/10 text-green-400"
																		: "bg-zinc-500/10 text-zinc-500"
																)}>
																{Number(pos.liquidity) > 0 ? "Active" : "Closed"}
															</span>
														</div>
														<div className="text-sm text-zinc-300">
															Liquidity: {(Number(pos.liquidity) / 1e18).toFixed(4)}
														</div>
													</div>
													<button
														onClick={() => {
															const minP = getPriceFromTick(pos.tickLower);
															const maxP = getPriceFromTick(pos.tickUpper);
															setMinPrice(minP.toString());
															setMaxPrice(maxP.toString());
															setIsFullRange(false);
															toast.success(
																`Price range filled from position #${pos.tokenId.toString()}`
															);
														}}
														className="px-4 py-2 rounded-xl bg-[var(--brand-lime)] text-black font-bold text-xs hover:bg-[var(--brand-lime)]/90 transition-all">
														Use Range
													</button>
												</div>
											</div>
										);
									})}
								</div>
								<div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
									<Info className="w-4 h-4 inline mr-2" />
									If you use the same price range as an existing position, liquidity will
									be added to that position automatically.
								</div>
							</div>
						)}

					{!isIncreaseMode &&
						token0 &&
						token1 &&
						(!isPoolExists || (isPoolExists && !isInitialized)) && (
							<div className="bg-[#0A0A0A] rounded-[24px] border border-[var(--brand-lime)]/30 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
								<div>
									<h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">
										Set Starting Price
									</h3>
									<p className="text-xs text-zinc-500 mb-4">
										This pool must be initialized before you can add liquidity.
									</p>
									<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
										<div className="flex justify-between items-center mb-2">
											<span className="text-xs text-zinc-500">
												Start Price ({token1.symbol} per {token0.symbol})
											</span>
										</div>
										<div className="flex items-center gap-3">
											<input
												type="text"
												value={startPrice}
												onChange={(e) => setStartPrice(e.target.value)}
												placeholder="0.0"
												className="w-full bg-transparent text-2xl font-bold text-white outline-none"
											/>
											<span className="text-zinc-500 font-medium">{token1?.symbol}</span>
										</div>
									</div>
								</div>
							</div>
						)}

					{token0 && token1 && (
						<div className="bg-[#0A0A0A] rounded-[24px] border border-white/5 p-6 space-y-5">
							<div className="flex items-center justify-between">
								<h3 className="text-[10px] font-bold text-white uppercase tracking-widest">
									Deposit Amounts
								</h3>
								{isIncreaseMode && (
									<span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
										Position #{tokenId}
									</span>
								)}
							</div>

							<div className="space-y-4">
								{/* Token 0 Input */}
								<div className="bg-white/5 rounded-[24px] p-6 border border-white/5 hover:border-white/10 transition-all group">
									<div className="flex justify-between items-center mb-4">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold border border-blue-500/50">
												{token0.symbol[0]}
											</div>
											<span className="font-bold text-lg text-white">{token0.symbol}</span>
										</div>
										<button
											onClick={() =>
												handleAmount0Change(
													formatUnits(balance0?.value || 0n, token0.decimals)
												)
											}
											className="text-xs text-zinc-500 hover:text-[var(--brand-lime)] transition-colors">
											Balance:{" "}
											{balance0
												? parseFloat(
														formatUnits(balance0.value, token0.decimals)
												  ).toLocaleString(undefined, { maximumFractionDigits: 6 })
												: "0"}
										</button>
									</div>
									<input
										type="text"
										value={amount0}
										onChange={(e) => handleAmount0Change(e.target.value)}
										placeholder="0.0"
										className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-white/5"
									/>
									{isIncreaseMode && existingPosition && (
										<div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
											<span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
												Current Position
											</span>
											<span className="text-xs text-white font-mono">
												{(
													Number(existingPosition.tokensOwed0) /
													10 ** token0.decimals
												).toFixed(4)}{" "}
												{token0.symbol}
											</span>
										</div>
									)}
								</div>

								{/* Token 1 Input */}
								<div className="bg-white/5 rounded-[24px] p-6 border border-white/5 hover:border-white/10 transition-all group">
									<div className="flex justify-between items-center mb-4">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold border border-purple-500/50">
												{token1.symbol[0]}
											</div>
											<span className="font-bold text-lg text-white">{token1.symbol}</span>
										</div>
										<button
											onClick={() =>
												handleAmount1Change(
													formatUnits(balance1?.value || 0n, token1.decimals)
												)
											}
											className="text-xs text-zinc-500 hover:text-[var(--brand-lime)] transition-colors">
											Balance:{" "}
											{balance1
												? parseFloat(
														formatUnits(balance1.value, token1.decimals)
												  ).toLocaleString(undefined, { maximumFractionDigits: 6 })
												: "0"}
										</button>
									</div>
									<input
										type="text"
										value={amount1}
										onChange={(e) => handleAmount1Change(e.target.value)}
										placeholder="0.0"
										className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-white/5"
									/>
									{isIncreaseMode && existingPosition && (
										<div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
											<span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
												Current Position
											</span>
											<span className="text-xs text-white font-mono">
												{(
													Number(existingPosition.tokensOwed1) /
													10 ** token1.decimals
												).toFixed(4)}{" "}
												{token1.symbol}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{!isIncreaseMode && token0 && token1 && (
						<div className="bg-[#0A0A0A] rounded-[24px] border border-white/5 p-6 space-y-5">
							<div className="flex items-center justify-between">
								<h3 className="text-[10px] font-bold text-white uppercase tracking-widest">
									Set Price Range
								</h3>
								<button
									onClick={() => setIsFullRange(!isFullRange)}
									className={cn(
										"px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
										isFullRange
											? "bg-[var(--brand-lime)] text-black border-[var(--brand-lime)]"
											: "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
									)}>
									Full Range
								</button>
							</div>

							{!isFullRange ? (
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-white/2 rounded-[24px] p-6 border border-white/5 text-center group hover:border-[var(--brand-lime)]/30 transition-all">
										<div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">
											Min Price
										</div>
										<input
											type="text"
											className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none mb-1 cursor-ew-resize"
											placeholder="0.00"
											value={minPrice}
											onChange={(e) => setMinPrice(e.target.value)}
										/>
										<div className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
											{token1.symbol} per {token0.symbol}
										</div>
									</div>
									<div className="bg-white/2 rounded-[24px] p-6 border border-white/5 text-center group hover:border-[var(--brand-lime)]/30 transition-all">
										<div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">
											Max Price
										</div>
										<input
											type="text"
											className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none mb-1 cursor-ew-resize"
											placeholder="0.00"
											value={maxPrice}
											onChange={(e) => setMaxPrice(e.target.value)}
										/>
										<div className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
											{token1.symbol} per {token0.symbol}
										</div>
									</div>
								</div>
							) : (
								<div className="bg-[var(--brand-lime)]/5 rounded-[24px] p-8 border border-[var(--brand-lime)]/20 flex items-center gap-6">
									<div className="w-12 h-12 rounded-full bg-[var(--brand-lime)]/10 flex items-center justify-center flex-shrink-0 animate-pulse">
										<Info className="w-6 h-6 text-[var(--brand-lime)]" />
									</div>
									<p className="text-sm text-zinc-400 leading-relaxed font-medium">
										Full range positions earn less fees but are always active across all
										price levels. Ideal for highly correlated tokens.
									</p>
								</div>
							)}
						</div>
					)}

					<div className="pt-2">
						{!isConnected ? (
							<button
								onClick={() => open()}
								className="w-full btn-primary py-4 rounded-xl text-lg h-16">
								Connect Wallet
							</button>
						) : (
							<button
								onClick={handleUnifiedFlow}
								disabled={
									!token0 ||
									!token1 ||
									isInvalidPair ||
									!amount0 ||
									!amount1 ||
									(!isPoolExists && !startPrice) ||
									(isPoolExists && !isInitialized && !startPrice) ||
									isPending ||
									(isPoolExists && isPoolStateLoading)
								}
								className="w-full py-3.5 rounded-xl text-base font-bold shadow-lg transition-all bg-[var(--brand-lime)] text-black hover:bg-[var(--brand-lime)]/90 h-14 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
								{isPending
									? "Processing..."
									: isInvalidPair
									? "Use Wrap/Unwrap"
									: isPoolExists && isPoolStateLoading
									? "Checking State..."
									: "Preview"}
							</button>
						)}
						{isInvalidPair && (
							<div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
								<div className="flex gap-3">
									<Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
									<div className="space-y-1">
										<p className="text-sm font-medium text-white">Pool not allowed</p>
										<p className="text-xs text-zinc-400 leading-relaxed">
											Native ETH and WETH combinations are handled directly via the{" "}
											<Link
												href="/swap"
												className="text-[var(--brand-lime)] hover:underline font-bold">
												Swap interface
											</Link>{" "}
											for 0% slippage wrapping.
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{!isIncreaseMode && (
					<div className="hidden lg:block">
						{token0 && token1 ? (
							<PriceGapChart
								minPrice={!isInitialized ? startPrice : minPrice}
								maxPrice={!isInitialized ? startPrice : maxPrice}
								currentPrice={poolCurrentPrice?.toString() || startPrice || "0"}
								symbol0={token0.symbol}
								symbol1={token1.symbol}
							/>
						) : (
							<div className="h-[300px] w-full glass-panel border-white/10 rounded-2xl flex items-center justify-center text-zinc-500">
								Select tokens to view price chart
							</div>
						)}
					</div>
				)}
			</div>

			{token0 && token1 && (
				<TransactionProgressModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					token0={token0}
					token1={token1}
					amount0={amount0}
					amount1={amount1}
					status={txStatus}
					needsCreate={needsCreate}
					needsInitialize={needsInitialize}
					needsApproval0={needsApproval0}
					needsApproval1={needsApproval1}
					error={errorMsg}
				/>
			)}

			<TokenSelector
				isOpen={isToken0SelectorOpen}
				onClose={() => setIsToken0SelectorOpen(false)}
				onSelect={setToken0}
				selectedToken={token0 || TOKENS[0]}
			/>
			<TokenSelector
				isOpen={isToken1SelectorOpen}
				onClose={() => setIsToken1SelectorOpen(false)}
				onSelect={setToken1}
				selectedToken={token1 || TOKENS[1]}
			/>
		</div>
	);
}
