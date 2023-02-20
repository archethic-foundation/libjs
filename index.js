import Account from "./lib/account.js";
import { getNearestEndpoints } from "./lib/api.js";
import { ArchethicRPCClient } from "./lib/api/wallet_rpc.js";
import * as Crypto from "./lib/crypto.js";
import { Endpoint, WalletRPCEndpoint } from "./lib/endpoint.js";
import Network from "./lib/network.js";
import Transaction from "./lib/transaction.js";
import * as Utils from "./lib/utils.js";

export { Utils, Crypto };

export default class Archethic {
  constructor(endpoint) {
    this.endpoint = Endpoint.build(endpoint);
    if (this.endpoint instanceof WalletRPCEndpoint) {
      this.rpcWallet = ArchethicRPCClient.instance
    }

    this.transaction = new Transaction(this);
    this.account = new Account(this);
    this.network = new Network(this);
    this.nearestEndpoints = [];
  }

  async connect() {
    if (this.endpoint instanceof WalletRPCEndpoint) {
      await this.endpoint.resolve()
    }

    const nodes = await getNearestEndpoints(this.endpoint.nodeEndpoint);

    let nearestEndpoints = nodes.map(({ ip, port }) => {
      return `http://${ip}:${port}`;
    });

    nearestEndpoints.push(this.endpoint.origin) // Add the main endpoint as fallback

    this.nearestEndpoints = [...new Set(nearestEndpoints)]

    return this;
  }

  async requestNode(call) {
    const node = this.nearestEndpoints[0];

    try {
      return await call(node);
    } catch (err) {
      console.error(err);
      this.nearestEndpoints.shift();
      if (this.nearestEndpoints.length == 0) {
        throw "Cannot reach Archethic node";
      }
      return this.requestNode(call);
    }
  }
}
