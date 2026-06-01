"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { useCofheEncrypt } from "@cofhe/react";
import { Encryptable } from "@cofhe/sdk";
import { UNDERWRITER_ABI } from "@/utils/abi";
import { UNDERWRITER_AUCTION_ADDRESSES, PREMIUM_UNIT_WEI } from "@/utils/constants";

const RISK_TIER_LABELS: Record<number, string> = { 1: "LOW", 2: "MID", 3: "HIGH" };
const RISK_TIER_COLORS: Record<number, string>  = { 1: "var(--green)", 2: "var(--amber)", 3: "#ef4444" };

type Tab = "tranches" | "create";

function TrancheCard({
  trancheId,
  auctionAddress,
  userAddress,
}: {
  trancheId: bigint;
  auctionAddress: `0x${string}`;
  userAddress: `0x${string}` | undefined;
}) {
  const { data: tranche } = useReadContract({
    address: auctionAddress,
    abi: UNDERWRITER_ABI,
    functionName: "tranches",
    args: [trancheId],
    query: { refetchInterval: 10_000 },
  });

  const { writeContractAsync }  = useWriteContract();
  const { encryptInputsAsync }  = useCofheEncrypt();
  const [bidUnits, setBidUnits] = useState(500);
  const [bidding, setBidding]   = useState(false);

  const t = tranche as any[] | undefined;
  if (!t || !t[3]) return null; // active = t[3]

  const riskTier       = Number(t[0]);
  const targetCapacity = Number(t[1]);
  const tierColor      = RISK_TIER_COLORS[riskTier] ?? "var(--white)";
  const tierLabel      = RISK_TIER_LABELS[riskTier] ?? `TIER ${riskTier}`;

  async function placeBid() {
    setBidding(true);
    try {
      const [encCap] = await encryptInputsAsync([Encryptable.uint64(BigInt(bidUnits))]);
      await writeContractAsync({
        address: auctionAddress,
        abi: UNDERWRITER_ABI,
        functionName: "placeBid",
        args: [trancheId, encCap as any],
        value: PREMIUM_UNIT_WEI * BigInt(bidUnits),
      });
      toast.success(`Bid placed on tranche #${trancheId}`);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Bid failed");
    } finally {
      setBidding(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="panel overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: tierColor }} />
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            TRANCHE #{trancheId.toString()}
          </span>
          <span className="mono text-[9px] px-2 py-0.5"
            style={{ border: `1px solid ${tierColor}`, color: tierColor }}>
            {tierLabel} RISK
          </span>
        </div>
        <EncryptionBadge status="encrypted" />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
            <div style={{ color: "var(--gray-3)" }}>target capacity</div>
            <div className="font-bold text-sm" style={{ color: "var(--white)" }}>
              {targetCapacity} units
              <span style={{ color: "var(--gray-3)" }}> ({(targetCapacity * 0.0001).toFixed(4)} ETH)</span>
            </div>
          </div>
        </div>

        <div className="mono text-[10px] p-3 space-y-1"
          style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
          <div style={{ color: "var(--green)" }}>// BLIND AUCTION MECHANICS</div>
          <div>{"FHE.add(encFilled, encCapacity)"}</div>
          <div>{"FHE.lte(newFilled, targetCapacity) -> match"}</div>
          <div style={{ color: "var(--gray-3)" }}>no underwriter sees competing bids</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
              MY CAPACITY (units)
            </span>
            <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{bidUnits}</span>
          </div>
          <input type="range" min={100} max={5000} step={100} value={bidUnits}
            onChange={e => setBidUnits(Number(e.target.value))} className="w-full" />
          <p className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
            collateral: {(bidUnits * 0.0001).toFixed(4)} ETH (refunded if tranche oversubscribed)
          </p>
          <button className="btn-primary w-full justify-center" onClick={placeBid} disabled={bidding || !userAddress}>
            {bidding ? "ENCRYPTING…" : <><Layers size={12} /> PLACE ENCRYPTED BID</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function UnderwriterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const auctionAddress = UNDERWRITER_AUCTION_ADDRESSES[chainId];

  const [tab, setTab]       = useState<Tab>("tranches");
  const [riskTier, setTier] = useState(1);
  const [targetCap, setTargetCap] = useState(10000);
  const [creating, setCreating] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const { data: nextId } = useReadContract({
    address: auctionAddress,
    abi: UNDERWRITER_ABI,
    functionName: "nextTrancheId",
    query: { refetchInterval: 10_000 },
  });

  const { data: owner } = useReadContract({
    address: auctionAddress,
    abi: UNDERWRITER_ABI,
    functionName: "committeeOwner",
  });

  const trancheCount = typeof nextId === "bigint" ? Number(nextId) : 0;
  const trancheIds   = Array.from({ length: trancheCount }, (_, i) => BigInt(i));
  const isOwner      = owner?.toString().toLowerCase() === address?.toLowerCase();

  async function handleCreate() {
    setCreating(true);
    try {
      await writeContractAsync({
        address: auctionAddress,
        abi: UNDERWRITER_ABI,
        functionName: "createTranche",
        args: [riskTier, BigInt(targetCap)],
      });
      toast.success(`Tranche created — risk tier ${RISK_TIER_LABELS[riskTier]}`);
      setTab("tranches");
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
            // BLIND UNDERWRITER AUCTION
          </span>
          <h1 className="font-black text-3xl mt-1 mb-3" style={{ letterSpacing: "-0.04em" }}>
            UNDERWRITE RISK
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--gray-1)", lineHeight: 1.7 }}>
            Back ShieldFi risk tranches with encrypted capacity bids. FHE.add accumulates
            commitments; FHE.lte(encFilled, targetCapacity) determines allocation — no
            underwriter sees competing bids at any point.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["tranches", "create"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="mono text-[10px] tracking-widest px-4 py-2.5 transition-colors"
              style={{
                color: tab === t ? "var(--green)" : "var(--gray-2)",
                borderBottom: tab === t ? "1px solid var(--green)" : "none",
                marginBottom: -1,
              }}>
              {t === "tranches" ? "OPEN TRANCHES" : "CREATE TRANCHE"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "tranches" && (
            <motion.div key="tranches" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!isConnected ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  connect wallet to browse tranches
                </div>
              ) : trancheCount === 0 ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  no tranches open yet
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {trancheIds.map(id => (
                    <TrancheCard key={id.toString()} trancheId={id}
                      auctionAddress={auctionAddress}
                      userAddress={address} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "create" && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="max-w-lg">
              {!isOwner ? (
                <div className="panel p-8 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  only the committee owner can create tranches
                </div>
              ) : (
                <div className="panel panel-accent p-6 space-y-5">
                  <div>
                    <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                      // OPEN NEW TRANCHE
                    </span>
                    <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                      Underwriters will bid anonymously with encrypted capacity.
                    </p>
                  </div>

                  <div>
                    <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: "var(--gray-2)" }}>
                      RISK TIER
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(tier => (
                        <button key={tier}
                          onClick={() => setTier(tier)}
                          className="flex-1 mono text-[11px] py-2 transition-colors"
                          style={{
                            border: `1px solid ${riskTier === tier ? RISK_TIER_COLORS[tier] : "var(--border-mid)"}`,
                            color: riskTier === tier ? RISK_TIER_COLORS[tier] : "var(--gray-2)",
                            background: riskTier === tier ? `${RISK_TIER_COLORS[tier]}15` : "transparent",
                          }}>
                          {RISK_TIER_LABELS[tier]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                        TARGET CAPACITY (units)
                      </label>
                      <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{targetCap.toLocaleString()}</span>
                    </div>
                    <input type="range" min={1000} max={100000} step={1000} value={targetCap}
                      onChange={e => setTargetCap(Number(e.target.value))} className="w-full" />
                    <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                      {(targetCap * 0.0001).toFixed(2)} ETH total capacity
                    </p>
                  </div>

                  <div className="mono text-[10px] p-3 space-y-1"
                    style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
                    <div style={{ color: "var(--green)" }}>// AUCTION FLOW</div>
                    <div>1. createTranche(tier, target) — open tranche</div>
                    <div>2. placeBid(id, encCapacity) — blind encrypted bid</div>
                    <div>3. requestFillReveal — FHE.lte match</div>
                    <div>4. settleBid — accept or refund ETH</div>
                  </div>

                  <button className="btn-primary w-full justify-center"
                    onClick={handleCreate} disabled={creating || !isConnected}>
                    {creating ? "CREATING…" : <><Plus size={12} /> OPEN TRANCHE</>}
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
