import Account, { Keychain } from "./account.js";
import * as Api from "./api.js";
import { NodeRPCClient } from "./api/node_rpc.js";
import { ConnectionState } from "./api/types.js";
import { AWCWebBrowserExtensionStreamChannel } from "./api/wallet_rpc.browserextension.js";
import { ArchethicWalletClient } from "./api/wallet_rpc.js";
import * as Crypto from "./crypto.js";
import { AWCEndpoint, Endpoint } from "./endpoint.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import * as Utils from "./utils.js";

export {
  AWCWebBrowserExtensionStreamChannel,
  ArchethicWalletClient,
  ConnectionState,
  Crypto,
  Keychain,
  Utils
};

export default class Archethic {
  endpoint: Endpoint;
  rpcWallet: ArchethicWalletClient | undefined;
  rpcNode: NodeRPCClient | undefined;
  transaction: Transaction;
  nearestEndpoints: Set<string>;
  account: Account;
  network: Network;

  /**
   * @param endpoint if undefined, endpoint will be resolved using ArchethicWalletClient.
   */
  constructor(endpoint: string | undefined) {
    this.endpoint = Endpoint.build(endpoint);
    if (this.endpoint instanceof AWCEndpoint) {
      this.rpcWallet = this.endpoint.rpcClient;
    }
    this.account = new Account(this);
    this.network = new Network(this);
    this.nearestEndpoints = new Set<string>();
    this.transaction = new Transaction(this);
    this.rpcNode = new NodeRPCClient(this);
  }

  async connect() {
    if (this.endpoint instanceof AWCEndpoint) {
      await this.endpoint.resolve();
    }
    const nodes = this.endpoint.nodeEndpoint === null ?
      [] :
      await Api.getNearestEndpoints(this.endpoint.nodeEndpoint.toString());

    let nearestEndpoints = nodes.map(({ ip, port }) => {
      return `http://${ip}:${port}`;
    });

    nearestEndpoints.push(this.endpoint.origin.toString()); // Add the main endpoint as fallback

    this.nearestEndpoints = new Set(nearestEndpoints);
    return this;
  }

  async requestNode(call: (endpoint: string) => Promise<any>): Promise<any> {
    const node = this.nearestEndpoints.values().next().value;

    try {
      return await call(node);
    } catch (err) {
      this.nearestEndpoints.delete(node);
      if (this.nearestEndpoints.size == 0) {
        console.log(err);
        throw new Error("Cannot reach Archethic node");
      }
      return this.requestNode(call);
    }
  }
}
