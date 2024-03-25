import TransportWebSocket from "isomorphic-ws";
import { AWCStreamChannel, AWCStreamChannelState } from "./wallet_rpc.js";

export class AWCWebsocketStreamChannel implements AWCStreamChannel<string> {
  private url: string;
  private websocket: TransportWebSocket | null = null;

  constructor(
    url: string
  ) {
    this.url = url;
  }

  async connect(): Promise<void> {
    console.log('WS:// connect');
    this.websocket = new TransportWebSocket(this.url);
    this.websocket.onopen = this._onReady === null ?
      null :
      (_: any) => {
        this._onReady!();
      }

    this.websocket.onmessage =
      this._onReceive === null ?
        null :
        (event: any) => {
          this._onReceive!(event.data.toString());
        }

    this.websocket.onclose = this._onClose === null ?
      null :
      (event: any) => {
        this.websocket = null;
        this._onClose!(event.reason);
      }
  }

  async close(): Promise<void> {
    this.websocket?.close();
    this.websocket = null;
  }

  async send(data: string): Promise<void> {
    await this.websocket.send(data);
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
    switch (this.websocket?.readyState) {
      case TransportWebSocket.CONNECTING: return AWCStreamChannelState.CONNECTING;
      case TransportWebSocket.OPEN: return AWCStreamChannelState.OPEN;
      case TransportWebSocket.CLOSING: return AWCStreamChannelState.CLOSING;
      default: return AWCStreamChannelState.CLOSED;
    }
  }
}
