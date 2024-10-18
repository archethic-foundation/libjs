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
  endpoint: Endpoint;
  rpcWallet: ArchethicWalletClient | undefined;
  rpcNode: NodeRPCClient | undefined;
  transaction: Transaction;
  account: Account;
  network: Network;

  /**
   * @param endpoint if undefined, endpoint will be resolved using ArchethicWalletClient.
   */
  constructor(endpoint: string | undefined) {
    this.endpoint = new EndpointFactory().build(endpoint);
    if (this.endpoint instanceof AWCEndpoint) {
      this.rpcWallet = this.endpoint.rpcClient;
    }
    this.account = new Account(this);
    this.network = new Network(this);
    this.transaction = new Transaction(this);
    this.rpcNode = new NodeRPCClient(this);
  }

  async connect() {
    if (this.endpoint instanceof AWCEndpoint) {
      await this.endpoint.resolve();
    }
    return this;
  }

  async requestNode(call: (endpoint: URL) => Promise<any>): Promise<any> {
    if (!this.endpoint.nodeEndpoint) {
      throw new Error("Archethic node's endpoint is undefined");
    }

    try {
      return await call(this.endpoint.nodeEndpoint);
    } catch (err) {
      console.log(err);
      throw new Error("Cannot reach Archethic node");
    }
  }
}
