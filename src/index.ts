import * as Crypto from "./crypto.js";
import * as Utils from "./utils.js";
import * as Api from "./api.js";
import { DirectEndpoint, Endpoint, WalletRPCEndpoint } from "./endpoint.js";
import { ArchethicRPCClient } from "./api/wallet_rpc.js";
import { NodeRPCClient } from "./api/node_rpc.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import Account, { Keychain } from "./account.js";
import * as Contract from "./contract.js";

export { Utils, Crypto, Keychain, Contract };

export default class Archethic {
  endpoint: DirectEndpoint | WalletRPCEndpoint;
  rpcWallet: ArchethicRPCClient | undefined;
  rpcNode: NodeRPCClient | undefined;
  transaction: Transaction;
  nearestEndpoints: Set<string>;
  account: Account;
  network: Network;

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

  async connect() {
    if (this.endpoint instanceof WalletRPCEndpoint) {
      await this.endpoint.resolve();
    }
    const nodes = await Api.getNearestEndpoints(this.endpoint.nodeEndpoint.toString());

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
