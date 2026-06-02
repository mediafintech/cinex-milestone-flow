import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import {
  CONTRACT_ADDRESS,
  VERIFICATION_CONTRACT,
  ESCROW_CONTRACT,
  Pc,
  uintCV,
  stringAsciiCV,
  milestonesToCV,
  explorerTxUrl,
  readCampaign,
  type Milestone,
} from "@/lib/stacks";
import { request } from "@stacks/connect";
import type { ClarityValue, PostCondition } from "@stacks/transactions";

type PostConditionModeName = "allow" | "deny";


type TxStatus = "idle" | "broadcasting" | "pending" | "confirmed" | "error";

type StepTx = {
  txId?: string;
  status: TxStatus;
  error?: string;
};

const initialTx: StepTx = { status: "idle" };

function StatusBadge({ tx }: { tx: StepTx }) {
  if (tx.status === "idle") return null;
  const colors: Record<TxStatus, string> = {
    idle: "",
    broadcasting: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    pending: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    confirmed: "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40",
    error: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${colors[tx.status]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase tracking-wider">{tx.status}</span>
        {tx.txId && (
          <a
            href={explorerTxUrl(tx.txId)}
            target="_blank"
            rel="noreferrer"
            className="underline hover:no-underline truncate max-w-[60%]"
          >
            View on Explorer ↗
          </a>
        )}
      </div>
      {tx.error && <div className="mt-1 text-red-300/90">{tx.error}</div>}
    </div>
  );
}

function StepCard({
  index,
  title,
  description,
  children,
  done,
}: {
  index: number;
  title: string;
  description: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <section className="glass rounded-2xl p-6 shadow-2xl">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-bold ${
            done
              ? "border-[#4ade80] bg-[#4ade80]/20 text-[#4ade80]"
              : "border-white/15 bg-white/5 text-white/70"
          }`}
        >
          {done ? "✓" : index}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/60">{description}</p>
          <div className="mt-4 space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        {...props}
        className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono"
      />
    </label>
  );
}

export default function CineXDemo() {
  const wallet = useWallet();
  const [campaignState, setCampaignState] = useState<unknown>(null);
  const [loadingState, setLoadingState] = useState(false);

  // Step 1
  const [creatorName, setCreatorName] = useState("");
  const [vertical, setVertical] = useState("");
  const [tx1, setTx1] = useState<StepTx>(initialTx);

  // Step 2
  const [campaignId, setCampaignId] = useState("1");
  const [goal, setGoal] = useState("1000000");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "Pre-production", amount: "400000" },
    { name: "Production", amount: "600000" },
  ]);
  const [tx2, setTx2] = useState<StepTx>(initialTx);

  // Step 3
  const [depositCampaignId, setDepositCampaignId] = useState("1");
  const [depositAmount, setDepositAmount] = useState("500000");
  const [tx3, setTx3] = useState<StepTx>(initialTx);

  // Step 4
  const [approveCampaignId, setApproveCampaignId] = useState("1");
  const [approveIndex, setApproveIndex] = useState("0");
  const [tx4, setTx4] = useState<StepTx>(initialTx);

  // Step 5
  const [releaseCampaignId, setReleaseCampaignId] = useState("1");
  const [releaseIndex, setReleaseIndex] = useState("0");
  const [tx5, setTx5] = useState<StepTx>(initialTx);

  async function callContract(
    setTx: (t: StepTx) => void,
    contractName: string,
    functionName: string,
    functionArgs: unknown[],
    postConditions: unknown[] = [],
    postConditionMode: PostConditionMode = PostConditionMode.Deny,
    onDone?: () => void,
  ) {
    if (!wallet.connected) {
      setTx({ status: "error", error: "Connect your wallet first." });
      return;
    }
    setTx({ status: "broadcasting" });
    try {
      const res = await request("stx_callContract", {
        contract: `${CONTRACT_ADDRESS}.${contractName}` as `${string}.${string}`,
        functionName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        functionArgs: functionArgs as any,
        network: "testnet",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postConditions: postConditions as any,
        postConditionMode,
      });
      const txId = (res as { txid?: string }).txid;
      if (txId) {
        setTx({ status: "pending", txId });
        // optimistic confirmation hint after a delay
        setTimeout(() => setTx({ status: "confirmed", txId }), 4000);
        onDone?.();
      } else {
        setTx({ status: "confirmed" });
        onDone?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTx({ status: "error", error: msg });
    }
  }

  async function handleRegister() {
    await callContract(setTx1, VERIFICATION_CONTRACT, "register-creator", [
      stringAsciiCV(creatorName),
      stringAsciiCV(vertical),
    ]);
  }

  async function handleCreateCampaign() {
    await callContract(
      setTx2,
      ESCROW_CONTRACT,
      "create-campaign",
      [uintCV(BigInt(campaignId || "0")), milestonesToCV(milestones), uintCV(BigInt(goal || "0"))],
      [],
      PostConditionMode.Allow,
      () => refreshCampaign(campaignId),
    );
  }

  async function handleDeposit() {
    if (!wallet.address) return;
    const amount = BigInt(depositAmount || "0");
    const pc = Pc.principal(wallet.address).willSendEq(amount).ustx();
    await callContract(
      setTx3,
      ESCROW_CONTRACT,
      "deposit",
      [uintCV(BigInt(depositCampaignId || "0")), uintCV(amount)],
      [pc],
      PostConditionMode.Deny,
      () => refreshCampaign(depositCampaignId),
    );
  }

  async function handleApprove() {
    await callContract(
      setTx4,
      ESCROW_CONTRACT,
      "approve-milestone",
      [uintCV(BigInt(approveCampaignId || "0")), uintCV(BigInt(approveIndex || "0"))],
      [],
      PostConditionMode.Allow,
      () => refreshCampaign(approveCampaignId),
    );
  }

  async function handleRelease() {
    await callContract(
      setTx5,
      ESCROW_CONTRACT,
      "release-milestone-funds",
      [uintCV(BigInt(releaseCampaignId || "0")), uintCV(BigInt(releaseIndex || "0"))],
      [],
      PostConditionMode.Allow,
      () => refreshCampaign(releaseCampaignId),
    );
  }

  async function refreshCampaign(id: string) {
    if (!wallet.address) return;
    setLoadingState(true);
    const data = await readCampaign(id, wallet.address);
    setCampaignState(data);
    setLoadingState(false);
  }

  function updateMilestone(i: number, field: keyof Milestone, value: string) {
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg neon-border flex items-center justify-center">
              <span className="neon-text text-lg font-black">C</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">
                Cine<span className="neon-text">X</span> Demo
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Milestone-Based Financing · Stacks Testnet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {wallet.connected ? (
              <>
                <span className="hidden sm:inline rounded-full border border-[#4ade80]/40 bg-[#4ade80]/10 px-3 py-1 text-xs font-mono text-[#4ade80]">
                  {wallet.address?.slice(0, 6)}…{wallet.address?.slice(-4)}
                </span>
                <button
                  onClick={wallet.disconnect}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={wallet.connect} className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            Fund films, <span className="neon-text">milestone by milestone</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-white/60">
            A guided walkthrough of CineX's on-chain financing flow — register a creator, launch a
            campaign, back it, approve milestones, and release funds. All on Stacks testnet.
          </p>
          <div className="mt-6 rounded-xl glass border border-[#4ade80]/20 p-4 text-sm text-white/70">
            <span className="neon-text font-semibold">Note:</span> Uses testnet STX – free and
            worthless. Get testnet STX from the{" "}
            <a
              className="underline hover:text-[#4ade80]"
              href="https://explorer.hiro.so/sandbox/faucet?chain=testnet"
              target="_blank"
              rel="noreferrer"
            >
              Hiro faucet
            </a>
            .
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Steps */}
          <div className="space-y-5">
            <StepCard
              index={1}
              title="Register creator"
              description="Identify yourself in the verification module before launching."
              done={tx1.status === "confirmed"}
            >
              <Field
                label="Name"
                placeholder="Jane Director"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
              />
              <Field
                label="Vertical"
                placeholder="film, series, docu…"
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
              />
              <button
                disabled={!wallet.connected || !creatorName || !vertical || tx1.status === "broadcasting"}
                onClick={handleRegister}
                className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Register Creator
              </button>
              <StatusBadge tx={tx1} />
            </StepCard>

            <StepCard
              index={2}
              title="Create campaign"
              description="Define milestones and a total funding goal."
              done={tx2.status === "confirmed"}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Campaign ID"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                />
                <Field
                  label="Goal (µSTX)"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Milestones
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setMilestones((m) => [...m, { name: "", amount: "0" }])
                      }
                      className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
                    >
                      + Add
                    </button>
                    {milestones.length > 1 && (
                      <button
                        onClick={() => setMilestones((m) => m.slice(0, -1))}
                        className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
                      >
                        − Remove
                      </button>
                    )}
                  </div>
                </div>
                {milestones.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_40px] gap-2">
                    <input
                      className="input-dark rounded-lg px-3 py-2 text-sm font-mono"
                      placeholder="Milestone name"
                      value={m.name}
                      onChange={(e) => updateMilestone(i, "name", e.target.value)}
                    />
                    <input
                      className="input-dark rounded-lg px-3 py-2 text-sm font-mono"
                      placeholder="Amount µSTX"
                      value={m.amount}
                      onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                    />
                    <div className="flex items-center justify-center text-xs text-white/40">
                      #{i}
                    </div>
                  </div>
                ))}
              </div>
              <button
                disabled={!wallet.connected || tx2.status === "broadcasting"}
                onClick={handleCreateCampaign}
                className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Create Campaign
              </button>
              <StatusBadge tx={tx2} />
            </StepCard>

            <StepCard
              index={3}
              title="Deposit (backer)"
              description="Back the campaign by depositing STX into escrow."
              done={tx3.status === "confirmed"}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Campaign ID"
                  value={depositCampaignId}
                  onChange={(e) => setDepositCampaignId(e.target.value)}
                />
                <Field
                  label="Amount (µSTX)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <button
                disabled={!wallet.connected || tx3.status === "broadcasting"}
                onClick={handleDeposit}
                className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Deposit STX
              </button>
              <StatusBadge tx={tx3} />
            </StepCard>

            <StepCard
              index={4}
              title="Approve milestone"
              description="Mark a milestone as complete to unlock its funds."
              done={tx4.status === "confirmed"}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Campaign ID"
                  value={approveCampaignId}
                  onChange={(e) => setApproveCampaignId(e.target.value)}
                />
                <Field
                  label="Milestone Index"
                  value={approveIndex}
                  onChange={(e) => setApproveIndex(e.target.value)}
                />
              </div>
              <button
                disabled={!wallet.connected || tx4.status === "broadcasting"}
                onClick={handleApprove}
                className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Approve Milestone
              </button>
              <StatusBadge tx={tx4} />
            </StepCard>

            <StepCard
              index={5}
              title="Release funds"
              description="Release the approved milestone's escrowed STX to the creator."
              done={tx5.status === "confirmed"}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Campaign ID"
                  value={releaseCampaignId}
                  onChange={(e) => setReleaseCampaignId(e.target.value)}
                />
                <Field
                  label="Milestone Index"
                  value={releaseIndex}
                  onChange={(e) => setReleaseIndex(e.target.value)}
                />
              </div>
              <button
                disabled={!wallet.connected || tx5.status === "broadcasting"}
                onClick={handleRelease}
                className="neon-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Release Funds
              </button>
              <StatusBadge tx={tx5} />
            </StepCard>
          </div>

          {/* Side panel: campaign state */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="glass-strong rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Campaign State
                </h3>
                <button
                  onClick={() => refreshCampaign(campaignId)}
                  disabled={!wallet.connected || loadingState}
                  className="rounded-md border border-[#4ade80]/40 px-2 py-1 text-xs text-[#4ade80] hover:bg-[#4ade80]/10 disabled:opacity-40"
                >
                  {loadingState ? "…" : "Refresh"}
                </button>
              </div>
              <div className="text-xs text-white/50 mb-3">
                Read-only call to{" "}
                <code className="text-[#4ade80]">get-campaign</code> on {ESCROW_CONTRACT}.
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-black/60 p-3 text-[11px] leading-relaxed text-[#4ade80]/90 font-mono">
{campaignState ? JSON.stringify(campaignState, null, 2) : "// Run a step to populate"}
              </pre>
            </div>

            <div className="mt-4 glass rounded-2xl p-5 text-xs text-white/60">
              <div className="mb-2 font-semibold uppercase tracking-wider text-white/70">
                Contracts
              </div>
              <div className="space-y-1 font-mono break-all">
                <div>
                  <span className="text-white/40">Address:</span>{" "}
                  <span className="text-[#4ade80]">{CONTRACT_ADDRESS}</span>
                </div>
                <div>
                  <span className="text-white/40">Verification:</span>{" "}
                  <span className="text-white/80">{VERIFICATION_CONTRACT}</span>
                </div>
                <div>
                  <span className="text-white/40">Escrow:</span>{" "}
                  <span className="text-white/80">{ESCROW_CONTRACT}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          Built on Stacks · Testnet only · {new Date().getFullYear()} CineX
        </footer>
      </main>
    </div>
  );
}
