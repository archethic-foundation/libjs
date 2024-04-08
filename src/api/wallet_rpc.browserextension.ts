import { AWCStreamChannel, AWCStreamChannelState, ArchethicWalletClient } from "./wallet_rpc.js";


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
    return (typeof (archethic) === "undefined") ? undefined : archethic?.awc;
  }
}

export class AWCWebBrowserExtensionStreamChannel implements AWCStreamChannel<string> {
  private extensionId: string
  private port: chrome.runtime.Port | null = null
  private _state: AWCStreamChannelState = AWCStreamChannelState.CLOSED

  constructor(extensionId: string) {
    if (extensionId === undefined) throw new Error('Archethic Wallet Web extension not available');
    this.extensionId = extensionId
  }

  // /**
  //  * Gets the instance injected by the browser
  //  */
  // static get extensionInjectedInstance() : WebBrowserExtensionStreamChannel | undefined {
  //   return awc
  // }

  // static get extensionId(): string | undefined {
  //   const rawParams = document.currentScript?.dataset.params
  //   return rawParams === undefined ? undefined : JSON.parse(rawParams).extensionId
  // }

  async connect(): Promise<void> {
    this.port = chrome.runtime.connect(this.extensionId)
    this.port.onMessage.addListener((message, _) => {
      console.log(`Received message ${message}`)
      if (this._onReceive === null) return
      this._onReceive(message);
    })
    this.port.onDisconnect.addListener(() => {
      if (this._onClose === null) return

      this._state = AWCStreamChannelState.CLOSED;
      this._onClose('');
    })

    this._state = AWCStreamChannelState.OPEN;
    if (this._onReady !== null) {
      this._onReady()
    }
  }

  async close(): Promise<void> {
    this.port?.disconnect();
  }

  async send(data: string): Promise<void> {
    await this.port?.postMessage(data);
  }

  private _onReceive: ((data: string) => Promise<void>) | null = null;
  get onReceive() { return this._onReceive };
  set onReceive(onReceive: ((data: string) => Promise<void>) | null) {
    this._onReceive = onReceive;
  }

  private _onReady: (() => Promise<void>) | null = null;
  get onReady() { return this._onReady };
  set onReady(onReady: (() => Promise<void>) | null) {
    this._onReady = onReady;
  }

  private _onClose: ((reason: string) => Promise<void>) | null = null;
  get onClose() { return this._onClose };
  set onClose(onClose: ((reason: string) => Promise<void>) | null) {
    this._onClose = onClose;
  }

  get state(): AWCStreamChannelState {
    return this._state
  }
}
