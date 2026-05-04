"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseEther } from "viem";
import { INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES, PREMIUM_UNIT_WEI } from "@/utils/constants";

function useContractAddress() {
  const chainId = useChainId();
  return CONTRACT_ADDRESSES[chainId] ?? "0x0000000000000000000000000000000000000000" as `0x${string}`;
}

// ── Pool Stats ──────────────────────────────────────────────────────────────
export function usePoolStats() {
  const address = useContractAddress();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getPoolStats",
    query: { refetchInterval: 15_000 },
  });
}

// ── User Policies ───────────────────────────────────────────────────────────
export function useUserPolicies() {
  const address    = useContractAddress();
  const { address: user } = useAccount();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getUserPolicies",
    args: [user ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!user, refetchInterval: 10_000 },
  });
}

// ── User Claims ─────────────────────────────────────────────────────────────
export function useUserClaims() {
  const address    = useContractAddress();
  const { address: user } = useAccount();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getUserClaims",
    args: [user ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!user, refetchInterval: 10_000 },
  });
}

// ── Policy Detail ───────────────────────────────────────────────────────────
export function usePolicy(policyId: bigint | undefined) {
  const address = useContractAddress();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "policies",
    args: [policyId ?? 0n],
    query: { enabled: policyId !== undefined },
  });
}

// ── Claim Detail ────────────────────────────────────────────────────────────
export function useClaim(claimId: bigint | undefined) {
  const address = useContractAddress();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "claims",
    args: [claimId ?? 0n],
    query: { enabled: claimId !== undefined },
  });
}

// ── Revealed Premium ────────────────────────────────────────────────────────
export function useRevealedPremium(policyId: bigint | undefined) {
  const address = useContractAddress();
  return useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getRevealedPremium",
    args: [policyId ?? 0n],
    query: { enabled: policyId !== undefined, refetchInterval: 5_000 },
  });
}

// ── Register Policy (call from policy wizard after FHE encryption) ──────────
export function useRegisterPolicy() {
  const address = useContractAddress();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function registerPolicy(
    encAge: any,
    encRisk: any,
    encCoverage: any,
  ) {
    return writeContractAsync({
      address,
      abi: INSURANCE_ABI,
      functionName: "registerPolicy",
      args: [encAge, encRisk, encCoverage] as any,
    });
  }

  return { registerPolicy, isPending, isConfirming, isSuccess, hash };
}

// ── Pay Premium ─────────────────────────────────────────────────────────────
export function usePayPremium() {
  const address = useContractAddress();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function payPremium(policyId: bigint, units: number) {
    return writeContractAsync({
      address,
      abi: INSURANCE_ABI,
      functionName: "payPremium",
      args: [policyId],
      value: PREMIUM_UNIT_WEI * BigInt(units),
    });
  }

  return { payPremium, isPending, isConfirming, isSuccess, hash };
}

// ── File Claim ──────────────────────────────────────────────────────────────
export function useFileClaim() {
  const address = useContractAddress();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function fileClaim(
    policyId: bigint,
    encAmount: any,
    encSeverity: any,
  ) {
    return writeContractAsync({
      address,
      abi: INSURANCE_ABI,
      functionName: "fileClaim",
      args: [policyId, encAmount, encSeverity] as any,
    });
  }

  return { fileClaim, isPending, isConfirming, isSuccess, hash };
}

// ── Fund Pool ───────────────────────────────────────────────────────────────
export function useFundPool() {
  const address = useContractAddress();
  const { writeContractAsync, isPending } = useWriteContract();

  async function fundPool(ethAmount: string) {
    return writeContractAsync({
      address,
      abi: INSURANCE_ABI,
      functionName: "fundPool",
      value: parseEther(ethAmount),
    });
  }

  return { fundPool, isPending };
}
