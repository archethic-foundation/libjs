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
  private _port: chrome.runtime.Port | null = null
  private _state: AWCStreamChannelState = AWCStreamChannelState.CLOSED

  constructor(extensionId: string | undefined) {
    if (extensionId === undefined) throw new Error('Archethic Wallet Web extension not available');
    this.extensionId = extensionId
  }

  async connect(): Promise<void> {
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

  async port(): Promise<chrome.runtime.Port> {
    if (this._port !== null) {
      console.log(`Popup extension already running`)
      return this._port
    }

    console.log(`Wait for popup extension ...`)
    await chrome.runtime.sendMessage(this.extensionId, 'waitForExtensionPopup')
    console.log(`... ready`)


    console.log(`Connecting to popup extension ...`)
    this._port = chrome.runtime.connect(this.extensionId)
    this._port.onDisconnect.addListener(() => {
      this._port = null
    })
    this._port.onMessage.addListener((message: string, _) => {
      console.log(`Received message ${message}`)
      if (this.onReceive !== null) this.onReceive(message);
    })
    console.log(`... ready`)
    return this._port
  }

  async close(): Promise<void> {
    this._port?.disconnect();
    this._port = null;
    this._connectionClosed()
  }

  async send(data: string): Promise<void> {
    const port = await this.port()
    await port.postMessage(data)
  }

  public onReceive: ((data: string) => Promise<void>) | null = null;

  public onReady: (() => Promise<void>) | null = null;

  public onClose: ((reason: string) => Promise<void>) | null = null;

  get state(): AWCStreamChannelState {
    return this._state
  }
}
