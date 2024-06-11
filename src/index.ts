import Account, { Keychain } from "./account.js";
import * as Api from "./api.js";
import { NodeRPCClient } from "./api/node_rpc.js";
import { ConnectionState } from "./api/types.js";
import { AWCStreamChannel, AWCStreamChannelState, ArchethicWalletClient } from "./api/wallet_rpc.js";
import * as Crypto from "./crypto.js";
import { AWCEndpoint, Endpoint, EndpointFactory } from "./endpoint.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import * as Contract from "./contract.js";
import * as Utils from "./utils.js";

export {
  AWCStreamChannel,
  AWCStreamChannelState,
  ArchethicWalletClient,
  ConnectionState,
  Crypto,
  Keychain,
  Utils,
  Contract
};

export default class Archethic {
  /** @internal */
  endpoint: Endpoint;
  /** @internal */
  rpcWallet: ArchethicWalletClient | undefined;
  /** @internal */
  rpcNode: NodeRPCClient | undefined;
  transaction: Transaction;
  account: Account;
  network: Network;
  /** @internal */
  nearestEndpoints: Set<string>;

  /**
   * Create a new Archethic instance
   * @param {String} endpoint if undefined, endpoint will be resolved using ArchethicWalletClient.
   * @return {Archethic}
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * ```
   */
  constructor(endpoint: string | undefined) {
    this.endpoint = new EndpointFactory().build(endpoint);
    if (this.endpoint instanceof AWCEndpoint) {
      this.rpcWallet = this.endpoint.rpcClient;
    }
    this.account = new Account(this);
    this.network = new Network(this);
    this.nearestEndpoints = new Set<string>();
    this.transaction = new Transaction(this);
    this.rpcNode = new NodeRPCClient(this);
  }

  /**
   * Connect to the Archethic network
   * @return {Promise<Archethic>}
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * ```
   */
  async connect() {
    if (this.endpoint instanceof AWCEndpoint) {
      await this.endpoint.resolve();
    }
    const nodes =
      this.endpoint.nodeEndpoint === null ? [] : await Api.getNearestEndpoints(this.endpoint.nodeEndpoint.toString());

    const nearestEndpoints = nodes.map(({ ip, port }) => {
      return `http://${ip}:${port}`;
    });

    // Add the main endpoint as fallback
    nearestEndpoints.push(this.endpoint.origin.toString());

    this.nearestEndpoints = new Set(nearestEndpoints);
    return this;
  }

  /**
   * Request a node from the nearest nodes
   * @param {Function} call The function to call on the node
   * @return {String} The nearest node
   * @throws {Error} If no node is available
   * @private
   */
  async requestNode(call: (endpoint: string) => Promise<any>): Promise<any> {
    const node = this.nearestEndpoints.values().next().value;

    try {
      return await call(node);
    } catch (err) {
      this.nearestEndpoints.delete(node);
      if (this.nearestEndpoints.size === 0) {
        console.log(err);
        throw new Error("Cannot reach Archethic node");
      }
      return this.requestNode(call);
    }
  }
}
