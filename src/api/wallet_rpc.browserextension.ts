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

  constructor(extensionId: string | undefined) {
    if (extensionId === undefined) throw new Error('Archethic Wallet Web extension not available');
    this.extensionId = extensionId
  }

  async connect(): Promise<void> {
    this.port = chrome.runtime.connect(this.extensionId)
    this.port.onMessage.addListener((message: string, _) => {
      console.log(`Received message ${message}`)
      if (this.onReceive !== null) this.onReceive(message);
    })
    this._connectionReady()
  }

  _connectionClosed() {
    this._state = AWCStreamChannelState.CLOSED;
    if (this.onClose !== null) this.onClose('')
  }

  _connectionReady() {
    this._state = AWCStreamChannelState.OPEN;
    if (this.onReady !== null) this.onReady()
  }

  async close(): Promise<void> {
    this.port?.disconnect();
  }

  async send(data: string): Promise<void> {
    await this.port?.postMessage(data);
  }

  public onReceive: ((data: string) => Promise<void>) | null = null;

  public onReady: (() => Promise<void>) | null = null;

  public onClose: ((reason: string) => Promise<void>) | null = null;

  get state(): AWCStreamChannelState {
    return this._state
  }
}
