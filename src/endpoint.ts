import { ConnectionState } from "./api/types.js";
import { AWCWebBrowserExtension } from "./api/wallet_rpc.browserextension.js";
import { ArchethicWalletClient } from "./api/wallet_rpc.js";
import { AWCWebsocketStreamChannel } from "./api/wallet_rpc.websocket.js";

export abstract class Endpoint {
  abstract get isRpcAvailable(): boolean;
  abstract get origin(): string;
  abstract get nodeEndpoint(): URL | null;

  /**
   * @param {String | undefined} endpoint
   * @return {Endpoint}
   */
  static build(endpoint: string | undefined): Endpoint {
    if (endpoint === undefined) {
      console.log('Using AWC client');
      return new AWCEndpoint(
        AWCWebBrowserExtension.awc ??
        new ArchethicWalletClient(new AWCWebsocketStreamChannel(`ws://localhost:12345`))
      )
    }

    const url: URL = new URL(endpoint);
    if (url.protocol === "http:" || url.protocol === "https:") {
      console.log('Using direct endpoint');
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


export class AWCEndpoint extends Endpoint {
  // public readonly channel: AWCStreamChannel<string>;
  public readonly rpcClient: ArchethicWalletClient;
  public readonly origin: string;
  private _nodeEndpoint: URL | null;

  get isRpcAvailable(): boolean {
    return true;
  }

  /**
   * @param {String} endpoint
   */
  constructor(client: ArchethicWalletClient) {
    super()

    // this.channel = channel;

    /** @type {ArchethicWalletClient} */
    this.rpcClient = client;

    /** @type {String} */
    this.origin = 'AWC';

    this._nodeEndpoint = null;
  }

  get nodeEndpoint(): URL | null { return this._nodeEndpoint }

  async resolve() {
    if (this.rpcClient.connectionState !== ConnectionState.Open) {
      await this.rpcClient.connect();
    }

    await this.rpcClient.getEndpoint().then((response) => {
      this._nodeEndpoint = new URL(response["endpointUrl"]);
    });
  }
}
