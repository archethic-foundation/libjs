import * as Crypto from "./crypto.js";
import * as Utils from "./utils.js";
import * as Api from "./api.js";
import { DirectEndpoint, Endpoint, WalletRPCEndpoint } from "./endpoint.js";
import { ArchethicRPCClient } from "./api/wallet_rpc.js";
import { NodeRPCClient } from "./api/node_rpc.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import Account from "./account.js";
import Keychain from "./keychain.js";

export { Utils, Crypto, Keychain };

export default class Archethic {
  /** @internal */
  endpoint: DirectEndpoint | WalletRPCEndpoint;
  transaction: Transaction;
  account: Account;
  network: Network;
  /** @internal */
  nearestEndpoints: Set<string>;
  /** @internal */
  rpcWallet: ArchethicRPCClient | undefined;
  /** @internal */
  rpcNode: NodeRPCClient | undefined;

  /**
   * Create a new Archethic instance
   * @param {String} endpoint
   * @return {Archethic}
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * ```
   */
  constructor(endpoint: string) {
    this.endpoint = Endpoint.build(endpoint);
    if (this.endpoint instanceof WalletRPCEndpoint) {
      this.rpcWallet = ArchethicRPCClient.instance;
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
  async connect(): Promise<Archethic> {
    if (this.endpoint instanceof WalletRPCEndpoint) {
      await this.endpoint.resolve();
    }
    const nodes = await Api.getNearestEndpoints(this.endpoint.nodeEndpoint.toString());

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
