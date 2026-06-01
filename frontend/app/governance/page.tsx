"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Plus, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { GOVERNANCE_ABI, INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES } from "@/utils/constants";

const PARAM_LABELS: Record<number, string> = {
  0: "Quorum Threshold",
  1: "Min Severity",
  2: "Fraud Threshold",
};

const PARAM_DESC: Record<number, string> = {
  0: "Votes required before a claim reveal can be published",
  1: "Minimum encrypted severity score for a valid claim",
  2: "Maximum fraud score before a claim is FHE-rejected",
};

type Tab = "proposals" | "create";

function ProposalRow({
  proposalId,
  contractAddress,
  userAddress,
  isCommitteeMember,
}: {
  proposalId: bigint;
  contractAddress: `0x${string}`;
  userAddress: `0x${string}` | undefined;
  isCommitteeMember: boolean;
}) {
  const { data: proposal } = useReadContract({
    address: contractAddress,
    abi: GOVERNANCE_ABI,
    functionName: "proposals",
    args: [proposalId],
    query: { refetchInterval: 8_000 },
  });

  const { data: voted } = useReadContract({
    address: contractAddress,
    abi: GOVERNANCE_ABI,
    functionName: "hasVotedOnProposal",
    args: [proposalId, userAddress ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!userAddress },
  });

  const { data: quorum } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "quorumThreshold",
  });

  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);

  const p = proposal as any[] | undefined;
  if (!p) return null;

  const param     = Number(p[0]);
  const newValue  = Number(p[1]);
  const revealed  = p[4] as boolean;
  const executed  = p[5] as boolean;
  const quorumN   = typeof quorum === "bigint" ? Number(quorum) : 2;

  const statusColor = executed ? "var(--green)" : revealed ? "var(--amber)" : "var(--cyan)";
  const statusLabel = executed ? "EXECUTED" : revealed ? "REVEAL PENDING" : "VOTING";

  async function vote() {
    if (!isCommitteeMember || voted) return;
    setBusy(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: GOVERNANCE_ABI,
        functionName: "voteOnProposal",
        args: [proposalId],
      });
      toast.success(`Vote cast on proposal #${proposalId}`);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  async function requestReveal() {
    setBusy(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: GOVERNANCE_ABI,
        functionName: "requestProposalReveal",
        args: [proposalId],
      });
      toast.success("Reveal requested — CoFHE will decrypt the ballot");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Reveal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="panel overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            PROPOSAL #{proposalId.toString()}
          </span>
          <span className="mono text-[9px] px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <EncryptionBadge status="encrypted" />
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
              {PARAM_LABELS[param] ?? `PARAM ${param}`}
            </div>
            <div className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
              {PARAM_DESC[param] ?? ""}
            </div>
          </div>
          <div className="text-right">
            <div className="mono text-[10px]" style={{ color: "var(--gray-3)" }}>NEW VALUE</div>
            <div className="mono text-lg font-black" style={{ color: "var(--green)" }}>
              {newValue}
            </div>
          </div>
        </div>

        <div className="mono text-[10px] p-3 space-y-1"
          style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
          <div style={{ color: "var(--green)" }}>// FHE BALLOT</div>
          <div>{"FHE.add(encTally, 1) per vote"}</div>
          <div>{"FHE.gte(tally, quorum) -> pass/fail"}</div>
          <div style={{ color: "var(--gray-3)" }}>quorum = {quorumN} votes required</div>
        </div>

        {!executed && (
          <div className="flex gap-2">
            {!revealed && isCommitteeMember && !voted && (
              <button className="btn-primary flex-1 justify-center text-[11px]"
                onClick={vote} disabled={busy}>
                {busy ? "CASTING…" : <><Vote size={11} /> CAST ENCRYPTED VOTE</>}
              </button>
            )}
            {voted && !revealed && (
              <div className="mono text-[10px] px-3 py-2 flex items-center gap-2"
                style={{ color: "var(--green)", border: "1px solid rgba(0,255,136,0.3)" }}>
                <CheckCircle size={11} /> VOTED
              </div>
            )}
            {!revealed && isCommitteeMember && (
              <button className="btn-ghost flex-1 justify-center text-[11px]"
                onClick={requestReveal} disabled={busy}>
                REQUEST REVEAL
              </button>
            )}
            {revealed && !executed && (
              <div className="mono text-[10px] px-3 py-2 w-full text-center"
                style={{ color: "var(--amber)", border: "1px solid rgba(255,184,0,0.3)" }}>
                AWAITING CoFHE DECRYPT + executeProposal()
              </div>
            )}
          </div>
        )}
        {executed && (
          <div className="mono text-[10px] px-3 py-2 flex items-center gap-2"
            style={{ color: "var(--green)", border: "1px solid rgba(0,255,136,0.3)" }}>
            <CheckCircle size={11} /> EXECUTED — {PARAM_LABELS[param]} updated to {newValue}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = CONTRACT_ADDRESSES[chainId];

  const [tab, setTab]       = useState<Tab>("proposals");
  const [param, setParam]   = useState(0);
  const [newVal, setNewVal] = useState("");
  const [creating, setCreating] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const { data: nextId } = useReadContract({
    address: contractAddress,
    abi: GOVERNANCE_ABI,
    functionName: "nextProposalId",
    query: { refetchInterval: 10_000 },
  });

  const { data: isMember } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "isCommitteeMember",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const { data: isOwner } = useReadContract({
    address: contractAddress,
    abi: INSURANCE_ABI,
    functionName: "committeeOwner",
  });

  const { data: minSev }   = useReadContract({ address: contractAddress, abi: GOVERNANCE_ABI, functionName: "governableMinSeverity" });
  const { data: fraudThr } = useReadContract({ address: contractAddress, abi: GOVERNANCE_ABI, functionName: "governableFraudThreshold" });
  const { data: quorum }   = useReadContract({ address: contractAddress, abi: INSURANCE_ABI, functionName: "quorumThreshold" });

  const proposalCount   = typeof nextId === "bigint" ? Number(nextId) : 0;
  const proposalIds     = Array.from({ length: proposalCount }, (_, i) => BigInt(i));
  const isCommitteeMember = !!isMember;
  const isContractOwner   = isOwner?.toString().toLowerCase() === address?.toLowerCase();

  async function handleCreate() {
    if (!newVal || isNaN(Number(newVal))) { toast.error("Enter a valid value"); return; }
    setCreating(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: GOVERNANCE_ABI,
        functionName: "proposeParamChange",
        args: [param, BigInt(newVal)],
      });
      toast.success("Proposal created");
      setTab("proposals");
      setNewVal("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-10">
          <span className="mono text-[10px] tracking-widest" style={{ color: "var(--amber)" }}>
            // FHE ENCRYPTED GOVERNANCE
          </span>
          <h1 className="font-black text-3xl mt-1 mb-3" style={{ letterSpacing: "-0.04em" }}>
            PROTOCOL GOVERNANCE
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--gray-1)", lineHeight: 1.7 }}>
            Committee members cast encrypted ballots via Fhenix CoFHE. Votes accumulate
            with FHE.add; FHE.gte(tally, quorum) reveals pass/fail without exposing
            individual votes. Passed proposals update protocol parameters on-chain.
          </p>
        </div>

        {/* Live params */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "QUORUM",         value: quorum?.toString()   ?? "…" },
            { label: "MIN SEVERITY",   value: minSev?.toString()   ?? "…" },
            { label: "FRAUD THRESHOLD",value: fraudThr?.toString() ?? "…" },
          ].map(({ label, value }) => (
            <div key={label} className="panel p-4 text-center">
              <div className="mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gray-2)" }}>{label}</div>
              <div className="mono text-2xl font-black" style={{ color: "var(--green)" }}>{value}</div>
              <div className="mono text-[9px] mt-1" style={{ color: "var(--gray-3)" }}>LIVE VALUE</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["proposals", "create"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="mono text-[10px] tracking-widest px-4 py-2.5 transition-colors"
              style={{
                color: tab === t ? "var(--green)" : "var(--gray-2)",
                borderBottom: tab === t ? "1px solid var(--green)" : "none",
                marginBottom: -1,
              }}>
              {t === "proposals" ? "PROPOSALS" : "CREATE PROPOSAL"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "proposals" && (
            <motion.div key="proposals" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!isConnected ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  connect wallet to view proposals
                </div>
              ) : proposalCount === 0 ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  no proposals yet
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {proposalIds.map(id => (
                    <ProposalRow key={id.toString()} proposalId={id}
                      contractAddress={contractAddress}
                      userAddress={address}
                      isCommitteeMember={isCommitteeMember} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "create" && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="max-w-lg">
              {!isContractOwner ? (
                <div className="panel p-8 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  only the committee owner can create proposals
                </div>
              ) : (
                <div className="panel panel-accent p-6 space-y-5">
                  <div>
                    <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                      // NEW GOVERNANCE PROPOSAL
                    </span>
                    <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                      Committee members will vote via encrypted FHE ballots.
                    </p>
                  </div>

                  <div>
                    <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: "var(--gray-2)" }}>
                      PARAMETER
                    </label>
                    <select value={param} onChange={e => setParam(Number(e.target.value))}
                      className="w-full mono text-sm px-4 py-2.5 outline-none"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--white)" }}>
                      <option value={0}>Quorum Threshold</option>
                      <option value={1}>Min Severity</option>
                      <option value={2}>Fraud Threshold</option>
                    </select>
                    <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-3)" }}>
                      {PARAM_DESC[param]}
                    </p>
                  </div>

                  <div>
                    <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: "var(--gray-2)" }}>
                      NEW VALUE
                    </label>
                    <input value={newVal} onChange={e => setNewVal(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full mono text-sm px-4 py-2.5 outline-none"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--white)" }} />
                  </div>

                  <div className="mono text-[10px] p-3 space-y-1"
                    style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
                    <div style={{ color: "var(--green)" }}>// BALLOT FLOW</div>
                    <div>1. proposeParamChange(param, newValue)</div>
                    <div>2. voteOnProposal — FHE.add(encTally, 1)</div>
                    <div>3. requestProposalReveal — FHE.gte(tally, quorum)</div>
                    <div>4. executeProposal — publishDecryptResult</div>
                  </div>

                  <button className="btn-primary w-full justify-center"
                    onClick={handleCreate} disabled={creating || !isConnected}>
                    {creating ? "CREATING…" : <><Plus size={12} /> CREATE PROPOSAL</>}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
