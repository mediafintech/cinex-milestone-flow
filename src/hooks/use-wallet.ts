import { useEffect, useState, useCallback } from "react";
import { connect, disconnect, isConnected, getLocalStorage, request } from "@stacks/connect";

export type WalletState = {
  connected: boolean;
  address: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({ connected: false, address: null });

  const refresh = useCallback(() => {
    if (isConnected()) {
      const data = getLocalStorage();
      const stxAddr = data?.addresses?.stx?.[0]?.address ?? null;
      setState({ connected: !!stxAddr, address: stxAddr });
    } else {
      setState({ connected: false, address: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connectWallet = useCallback(async () => {
    try {
      await connect();
      refresh();
    } catch (e) {
      console.error("connect failed", e);
    }
  }, [refresh]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setState({ connected: false, address: null });
  }, []);

  return { ...state, connect: connectWallet, disconnect: disconnectWallet, request };
}
