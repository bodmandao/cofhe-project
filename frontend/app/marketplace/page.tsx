"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Tag, Gavel } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { useCofheEncrypt } from "@cofhe/react";
import { Encryptable } from "@cofhe/sdk";
import { INSURANCE_ABI, MARKETPLACE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES, MARKETPLACE_ADDRESSES, PREMIUM_UNIT_WEI } from "@/utils/constants";

type Tab = "browse" | "list";

function ListingCard({
  listingId,
  marketplaceAddress,
  userAddress,
}: {
  listingId: bigint;
  marketplaceAddress: `0x${string}`;
  userAddress: `0x${string}` | undefined;
}) {
  const { data: listing } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "listings",
    args: [listingId],
  });

  const { writeContractAsync } = useWriteContract();
  const { encryptInputsAsync } = useCofheEncrypt();
  const [bidUnits, setBidUnits] = useState(100);
  const [bidding, setBidding]   = useState(false);

  const l = listing as any[] | undefined;
  if (!l || !l[3]) return null; // active = l[3]

  const seller   = l[0] as string;
  const policyId = l[1] as bigint;
  const isOwn    = seller?.toLowerCase() === userAddress?.toLowerCase();

  async function placeBid() {
    setBidding(true);
    try {
      const [encBid] = await encryptInputsAsync([Encryptable.uint64(BigInt(bidUnits))]);
      await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "placeBid",
        args: [listingId, encBid as any],
        value: PREMIUM_UNIT_WEI * BigInt(bidUnits),
      });
      toast.success(`Bid placed for listing #${listingId}`);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Bid failed");
    } finally {
      setBidding(false);
    }
  }

  async function cancelListing() {
    try {
      await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "cancelListing",
        args: [listingId],
      });
      toast.success(`Listing #${listingId} cancelled`);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Cancel failed");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="panel overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            LISTING #{listingId.toString()}
          </span>
          <span className="mono text-[9px] px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--gray-2)" }}>
            POLICY #{policyId?.toString()}
          </span>
        </div>
        <EncryptionBadge status="encrypted" />
      </div>

      <div className="px-4 py-4">
        <div className="mono text-[10px] mb-4" style={{ color: "var(--gray-2)" }}>
          <span style={{ color: "var(--gray-3)" }}>seller </span>
          {seller?.slice(0, 8)}…{seller?.slice(-6)}
          {isOwn && <span style={{ color: "var(--green)" }}> ← you</span>}
        </div>

        <div className="mono text-[10px] p-3 mb-4 space-y-1"
          style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
          <div style={{ color: "var(--green)" }}>// FHE PRICE MATCHING</div>
          <div>seller ask: [ENCRYPTED]</div>
          <div>{"FHE.lte(ask, bid) -> match result"}</div>
          <div style={{ color: "var(--gray-3)" }}>no plaintext prices ever on-chain</div>
        </div>

        {isOwn ? (
          <button className="btn-ghost w-full justify-center" onClick={cancelListing}>
            CANCEL LISTING
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>BID (units)</span>
              <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{bidUnits}</span>
            </div>
            <input type="range" min={1} max={1000} value={bidUnits}
              onChange={e => setBidUnits(Number(e.target.value))} className="w-full" />
            <p className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
              deposit: {(bidUnits * 0.0001).toFixed(4)} ETH
            </p>
            <button className="btn-primary w-full justify-center" onClick={placeBid} disabled={bidding}>
              {bidding ? "ENCRYPTING BID…" : <><Gavel size={12} /> PLACE ENCRYPTED BID</>}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress   = CONTRACT_ADDRESSES[chainId];
  const marketplaceAddress = MARKETPLACE_ADDRESSES[chainId];

  const [tab, setTab]           = useState<Tab>("browse");
  const [listPolicyId, setListPid] = useState("");
  const [listAskUnits, setListAsk] = useState(200);
  const [listing, setListing]   = useState(false);

  const { encryptInputsAsync } = useCofheEncrypt();
  const { writeContractAsync }  = useWriteContract();

  const { data: nextId } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "nextListingId",
    query: { refetchInterval: 10_000 },
  });

  const listingCount = typeof nextId === "bigint" ? Number(nextId) : 0;
  const listingIds   = Array.from({ length: listingCount }, (_, i) => BigInt(i));

  async function handleList() {
    if (!listPolicyId) { toast.error("Enter policy ID"); return; }
    setListing(true);
    try {
      const [encAsk] = await encryptInputsAsync([Encryptable.uint64(BigInt(listAskUnits))]);
      await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "list",
        args: [BigInt(listPolicyId), encAsk as any],
      });
      toast.success(`Policy #${listPolicyId} listed`);
      setTab("browse");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "List failed");
    } finally {
      setListing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-10">
          <span className="mono text-[10px] tracking-widest" style={{ color: "var(--amber)" }}>
            // FHE POLICY MARKETPLACE
          </span>
          <h1 className="font-black text-3xl mt-1 mb-3" style={{ letterSpacing: "-0.04em" }}>
            POLICY MARKET
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--gray-1)", lineHeight: 1.7 }}>
            Buy and sell ShieldFi Policy NFTs. Ask and bid prices are encrypted via Fhenix CoFHE —
            FHE.lte(ask, bid) executes the match without either party revealing their price.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["browse", "list"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="mono text-[10px] tracking-widest px-4 py-2.5 transition-colors"
              style={{
                color: tab === t ? "var(--green)" : "var(--gray-2)",
                borderBottom: tab === t ? "1px solid var(--green)" : "none",
                marginBottom: -1,
              }}>
              {t === "browse" ? "BROWSE LISTINGS" : "LIST YOUR POLICY"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Browse */}
          {tab === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!isConnected ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  connect wallet to browse
                </div>
              ) : listingCount === 0 ? (
                <div className="panel p-12 text-center mono text-sm" style={{ color: "var(--gray-2)" }}>
                  no active listings yet
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {listingIds.map(id => (
                    <ListingCard key={id.toString()} listingId={id}
                      marketplaceAddress={marketplaceAddress}
                      userAddress={address} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* List */}
          {tab === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="max-w-lg">
              <div className="panel panel-accent p-6 space-y-5">
                <div>
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                    // LIST POLICY NFT
                  </span>
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                    Your policy NFT is escrowed in the marketplace contract. Your ask price is encrypted.
                  </p>
                </div>

                <div>
                  <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: "var(--gray-2)" }}>
                    POLICY ID
                  </label>
                  <input value={listPolicyId} onChange={e => setListPid(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full mono text-sm px-4 py-2.5 outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--white)" }} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                      ASK PRICE (units, encrypted)
                    </label>
                    <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{listAskUnits}</span>
                  </div>
                  <input type="range" min={1} max={2000} value={listAskUnits}
                    onChange={e => setListAsk(Number(e.target.value))} className="w-full" />
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                    ~ {(listAskUnits * 0.0001).toFixed(4)} ETH — encrypted before leaving browser
                  </p>
                </div>

                <div className="mono text-[10px] p-3 space-y-1"
                  style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
                  <div style={{ color: "var(--green)" }}>// MATCH FLOW</div>
                  <div>1. list(policyId, encAsk) — NFT escrowed</div>
                  <div>2. placeBid(listingId, encBid) — ETH deposited</div>
                  <div>3. requestMatchReveal — CoFHE decrypt</div>
                  <div>4. settleMatch — NFT transferred or ETH refunded</div>
                </div>

                <button className="btn-primary w-full justify-center" onClick={handleList} disabled={listing || !isConnected}>
                  {listing ? "ENCRYPTING ASK…" : <><Tag size={12} /> ENCRYPT ASK &amp; LIST POLICY</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
