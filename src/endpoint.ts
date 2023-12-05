import { ArchethicRPCClient } from "./api/wallet_rpc.js";

export class Endpoint {
  /**
   * @param {String} endpoint
   * @return {DirectEndpoint | WalletRPCEndpoint}
   */
  static build(endpoint: string): DirectEndpoint | WalletRPCEndpoint {
    const url: URL = new URL(endpoint);

    if (url.protocol === "ws:") {
      return new WalletRPCEndpoint(endpoint);
    }

    if (url.protocol === "http:" || url.protocol === "https:") {
      return new DirectEndpoint(endpoint);
    }

    throw new Error(`Invalid endpoint protocol: ${url.protocol}`);
  }
}

export class DirectEndpoint {
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

export class WalletRPCEndpoint {
  public rpcClient: ArchethicRPCClient;
  public origin: string;
  private rpcEndpoint: URL;
  public nodeEndpoint: URL | string;
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

    this.nodeEndpoint = "";
  }

  async resolve() {
    await this.rpcClient.connect(this.rpcEndpoint.hostname, parseInt(this.rpcEndpoint.port));

    await this.rpcClient.getEndpoint().then((response) => {
      this.nodeEndpoint = new URL(response["endpointUrl"]);
    });
  }
}
