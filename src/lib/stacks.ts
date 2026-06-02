import { STACKS_TESTNET } from "@stacks/network";
import {
  Pc,
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  stringAsciiCV,
  listCV,
  tupleCV,
  type ClarityValue,
} from "@stacks/transactions";

export const NETWORK = STACKS_TESTNET;
export const CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
export const VERIFICATION_CONTRACT = "project-verification-module";
export const ESCROW_CONTRACT = "milestone-escrow";

export const explorerTxUrl = (txId: string) =>
  `https://explorer.stacks.co/txid/${txId.startsWith("0x") ? txId : "0x" + txId}?chain=testnet`;

export type Milestone = { name: string; amount: string };

export const milestonesToCV = (milestones: Milestone[]): ClarityValue =>
  listCV(
    milestones.map((m) =>
      tupleCV({
        name: stringAsciiCV(m.name),
        amount: uintCV(BigInt(m.amount || "0")),
      }),
    ),
  );

export async function readCampaign(campaignId: string, senderAddress: string) {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: ESCROW_CONTRACT,
      functionName: "get-campaign",
      functionArgs: [uintCV(BigInt(campaignId || "0"))],
      network: NETWORK,
      senderAddress,
    });
    return cvToJSON(result);
  } catch (e) {
    console.error("readCampaign failed", e);
    return null;
  }
}

export { Pc, uintCV, stringAsciiCV };
