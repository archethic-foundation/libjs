import { ArchethicRPCClient } from "./api/wallet_rpc.js";

export abstract class Endpoint {
  abstract get isRpcAvailable(): boolean;
  abstract get origin(): string;
  abstract get nodeEndpoint(): URL | null;

  /**
   * @param {String} endpoint
   * @return {Endpoint}
   */
  static build(endpoint: string): Endpoint {
    const url: URL = new URL(endpoint);

    if (WalletRPCEndpoint.handlesProtocol(url.protocol)) {
      return new WalletRPCEndpoint(endpoint);
    }

    if (url.protocol === "http:" || url.protocol === "https:") {
      return new DirectEndpoint(endpoint);
    }

    throw new Error(`Invalid endpoint protocol: ${url.protocol}`);
  }
}

export class DirectEndpoint implements Endpoint {
  public origin: string;
  public nodeEndpoint: URL;
  /**
   * @return {Boolean}
   */
  get isRpcAvailable(): boolean {
    return false;
  }

  /**
   * @param {String} endpoint
   */
  constructor(endpoint: string) {
    /** @type {String} */
    this.origin = endpoint;

    /** @type {URL} */
    this.nodeEndpoint = new URL(endpoint);
  }
}

export class WalletRPCEndpoint implements Endpoint {
  public rpcClient: ArchethicRPCClient;
  public origin: string;
  private rpcEndpoint: URL;
  public nodeEndpoint: URL | null;

  static WEBCHANNEL_PROTOCOL = "wc:";
  static WEBSOCKET_PROTOCOL = "ws:";
  static handlesProtocol(scheme: string) {
    return scheme === this.WEBCHANNEL_PROTOCOL || scheme === this.WEBSOCKET_PROTOCOL;
  }

  /**
   * @return {Boolean}
   */
  get isRpcAvailable(): boolean {
    return true;
  }

  /**
   * @param {String} endpoint
   */
  constructor(endpoint: string) {
    /** @type {ArchethicRPCClient} */
    this.rpcClient = ArchethicRPCClient.instance;

    /** @type {String} */
    this.origin = endpoint;

    /** @type {URL} */
    this.rpcEndpoint = new URL(endpoint);

    this.nodeEndpoint = null;
  }

  async resolve() {

    await this.rpcClient.connectWebsocket(this.rpcEndpoint.hostname, parseInt(this.rpcEndpoint.port));

    await this.rpcClient.getEndpoint().then((response) => {
      this.nodeEndpoint = new URL(response["endpointUrl"]);
    });
  }

  private async connect(): Promise<void> {
    if (this.rpcEndpoint.protocol === WalletRPCEndpoint.WEBSOCKET_PROTOCOL) {
      return this.rpcClient.connectWebsocket(this.rpcEndpoint.hostname, parseInt(this.rpcEndpoint.port));
    }
    // return this.rpcClient.connect(this.rpcEndpoint.hostname, parseInt(this.rpcEndpoint.port));

  }
}
