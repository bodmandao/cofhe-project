"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES, CLAIM_STATUS_MAP } from "@/utils/constants";

function VoteRow({
  claimId,
  address,
  contractAddress,
  userAddress,
  isCommitteeMember,
}: {
  claimId: bigint;
  address: `0x${string}`;
  contractAddress: `0x${string}`;
  userAddress: `0x${string}` | undefined;
  isCommitteeMember: boolean;
}) {
  const { data: claim } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "claims",
    args: [claimId],
  });

  const { data: votes } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "voteCount",
    args: [claimId],
  });

  const { data: quorum } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "quorumThreshold",
  });

  const { data: hasVoted } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "hasVoted",
    args: [claimId, userAddress ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!userAddress },
  });

  const { data: quorumReached } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "claimQuorumReached",
    args: [claimId],
  });

  const { writeContractAsync } = useWriteContract();
  const [voting, setVoting] = useState(false);

  const claimArr = claim as any[] | undefined;
  if (!claimArr) return null;

  const statusIdx  = Number(claimArr[6]);
  const isPending  = statusIdx === 0;
  const voteCount  = typeof votes === "bigint" ? Number(votes) : 0;
  const quorumN    = typeof quorum === "bigint" ? Number(quorum) : 2;
  const progress   = Math.min((voteCount / quorumN) * 100, 100);

  async function vote() {
    if (!isCommitteeMember) return;
    setVoting(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: INSURANCE_ABI,
        functionName: "voteOnClaim",
        args: [claimId],
      });
      toast.success(`Vote submitted for claim #${claimId}`);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel overflow-hidden"
    >
      {/* Header row */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: isPending ? "var(--amber)" : quorumReached ? "var(--green)" : "var(--gray-2)" }}
          />
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            CLAIM #{claimId.toString()}
          </span>
          <span
            className="mono text-[9px] px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--gray-2)" }}
          >
            {CLAIM_STATUS_MAP[statusIdx] ?? "UNKNOWN"}
          </span>
          {quorumReached && (
            <span
              className="mono text-[9px] px-2 py-0.5"
              style={{ border: "1px solid var(--green)", color: "var(--green)", background: "rgba(0,255,136,0.06)" }}
            >
              QUORUM MET
            </span>
          )}
        </div>
        <EncryptionBadge status="encrypted" />
      </div>

      <div className="px-4 py-4">
        {/* Policy reference */}
        <div className="mono text-[10px] mb-4" style={{ color: "var(--gray-2)" }}>
          POLICY #{claimArr[0]?.toString() ?? "—"}
          <span style={{ color: "var(--gray-3)" }}> · filed by </span>
          {claimArr[1]?.slice(0, 6)}…{claimArr[1]?.slice(-4)}
        </div>

        {/* Vote progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-[9px] tracking-widest" style={{ color: "var(--gray-2)" }}>
              COMMITTEE VOTES
            </span>
            <span className="mono text-[10px] font-bold" style={{ color: quorumReached ? "var(--green)" : "var(--white)" }}>
              {voteCount} / {quorumN}
            </span>
          </div>
          <div
            className="h-1.5 w-full"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: quorumReached ? "var(--green)" : "var(--amber)",
              }}
            />
          </div>
        </div>

        {/* FHE validation note */}
        <div
          className="mono text-[9px] p-3 mb-4 space-y-1"
          style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}
        >
          <div style={{ color: "var(--green)" }}>// FHE VALIDATION (computed on ciphertexts)</div>
          <div>FHE.lte(claimAmount, encCoverage) → amountValid</div>
          <div>FHE.gte(severity, MIN_SEVERITY)  → severityValid</div>
          <div>FHE.and(amountValid, severityValid) → isValid</div>
          <div style={{ color: "var(--gray-3)" }}>committee quorum required before result is published</div>
        </div>

        {/* Vote button */}
        {isPending && isCommitteeMember && !hasVoted && (
          <button
            className="btn-primary w-full justify-center"
            onClick={vote}
            disabled={voting}
          >
            {voting ? (
              <>
                <span
                  className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                SUBMITTING VOTE…
              </>
            ) : (
              <>
                <CheckCircle size={12} /> VOTE TO APPROVE REVEAL
              </>
            )}
          </button>
        )}
        {hasVoted && (
          <div className="mono text-[10px] text-center" style={{ color: "var(--green)" }}>
            ✓ YOU HAVE VOTED
          </div>
        )}
        {isPending && isCommitteeMember === false && (
          <div className="mono text-[10px] text-center" style={{ color: "var(--gray-3)" }}>
            not a committee member
          </div>
        )}
        {!isPending && (
          <div className="mono text-[10px] text-center" style={{ color: "var(--gray-2)" }}>
            claim already {CLAIM_STATUS_MAP[statusIdx]?.toLowerCase()}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

export default function CommitteePage() {
  const { address, isConnected } = useAccount();
  const chainId        = useChainId();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [claimIdInput, setClaimIdInput] = useState("");

  const { data: isMember } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "isCommitteeMember",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const { data: members } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "getCommitteeMembers",
  });

  const { data: quorum } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "quorumThreshold",
  });

  const { data: totalClaims } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "totalClaims" as any,
  });

  const claimCount = typeof totalClaims === "bigint" ? Number(totalClaims) : 0;
  const allClaimIds = Array.from({ length: claimCount }, (_, i) => BigInt(i + 1));

  const parsedInput = claimIdInput.trim()
    ? claimIdInput.split(",").map(s => BigInt(s.trim())).filter(n => n > 0n)
    : allClaimIds;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <span className="mono text-[10px] tracking-widest" style={{ color: "var(--amber)" }}>
            // THRESHOLD COMMITTEE
          </span>
          <h1 className="font-black text-3xl mt-1 mb-3" style={{ letterSpacing: "-0.04em" }}>
            CLAIM REVIEW PORTAL
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--gray-1)", lineHeight: 1.7 }}>
            Committee members vote to authorise the CoFHE oracle reveal. The FHE coprocessor
            has already validated the claim on ciphertexts — the committee provides human
            oversight before the result is published on-chain.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-8">

          {/* Left: claims list */}
          <div className="space-y-4">
            {/* Filter input */}
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <span className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>CLAIM IDs:</span>
              <input
                value={claimIdInput}
                onChange={e => setClaimIdInput(e.target.value)}
                placeholder="leave blank for all, or 1,2,3"
                className="flex-1 mono text-xs bg-transparent outline-none"
                style={{ color: "var(--white)" }}
              />
            </div>

            {!isConnected ? (
              <div
                className="panel p-12 text-center mono text-sm"
                style={{ color: "var(--gray-2)" }}
              >
                connect wallet to view claims
              </div>
            ) : claimCount === 0 ? (
              <div
                className="panel p-12 text-center mono text-sm"
                style={{ color: "var(--gray-2)" }}
              >
                no claims filed yet
              </div>
            ) : (
              <AnimatePresence>
                {parsedInput.map(id => (
                  <VoteRow
                    key={id.toString()}
                    claimId={id}
                    address={address!}
                    contractAddress={contractAddress}
                    userAddress={address}
                    isCommitteeMember={!!isMember}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Right: committee info */}
          <div className="space-y-5">
            {/* Member status */}
            <div className="panel overflow-hidden">
              <div
                className="px-4 py-3 mono text-[10px] tracking-widest"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--green)" }}
              >
                // YOUR STATUS
              </div>
              <div className="p-4">
                {!isConnected ? (
                  <div className="mono text-[10px]" style={{ color: "var(--gray-3)" }}>not connected</div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: isMember ? "var(--green)" : "var(--gray-3)" }}
                    />
                    <span className="mono text-[10px]" style={{ color: isMember ? "var(--green)" : "var(--gray-2)" }}>
                      {isMember ? "COMMITTEE MEMBER" : "NOT A MEMBER"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Committee config */}
            <div className="panel overflow-hidden">
              <div
                className="px-4 py-3 mono text-[10px] tracking-widest"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--green)" }}
              >
                // COMMITTEE CONFIG
              </div>
              <div
                className="px-4 py-3 flex items-center justify-between row-hover"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>QUORUM</span>
                <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>
                  {quorum?.toString() ?? "—"} votes
                </span>
              </div>
              <div
                className="px-4 py-3 flex items-center justify-between row-hover"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>MEMBERS</span>
                <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>
                  {(members as string[] | undefined)?.length ?? "—"}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {(members as string[] | undefined)?.map((m, i) => (
                  <div key={m} className="mono text-[9px]" style={{ color: "var(--gray-2)" }}>
                    <span style={{ color: "var(--gray-3)" }}>{i + 1}. </span>
                    {m.slice(0, 8)}…{m.slice(-6)}
                    {m.toLowerCase() === address?.toLowerCase() && (
                      <span style={{ color: "var(--green)" }}> ← you</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Two-layer model */}
            <div className="panel p-4 space-y-3">
              <div className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                // TWO-LAYER TRUST MODEL
              </div>
              {[
                { layer: "01", label: "FHE LAYER",       col: "var(--violet)", desc: "Cryptographic validation on ciphertexts. Amount ≤ coverage, severity ≥ threshold. Cannot be faked." },
                { layer: "02", label: "COMMITTEE LAYER", col: "var(--amber)",  desc: "Human quorum authorises reveal. Prevents oracle spam and adds governance accountability." },
              ].map(({ layer, label, col, desc }) => (
                <div key={layer} className="flex gap-3">
                  <div
                    className="mono text-[9px] font-bold w-6 h-6 shrink-0 flex items-center justify-center"
                    style={{ border: `1px solid ${col}`, color: col }}
                  >
                    {layer}
                  </div>
                  <div>
                    <div className="mono text-[10px] font-bold mb-1" style={{ color: col }}>{label}</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--gray-2)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
