import { AWCStreamChannel, ArchethicWalletClient } from "./wallet_rpc.js"


declare global {
  /**
   * Objects injected by ArchethicWallet browser extension.
   */
  const archethic: {
    streamChannel: AWCStreamChannel<string> | undefined,
    awc: ArchethicWalletClient | undefined,
  } | undefined
}

export class AWCWebBrowserExtension {
  static get awc(): ArchethicWalletClient | undefined {
    return (typeof (archethic) === "undefined") ? undefined : archethic?.awc
  }
}
