import { getNearestEndpoints } from "./lib/api.js";
import * as Utils from "./lib/utils.js";
import * as Crypto from "./lib/crypto.js";
import Account from "./lib/account.js";
import Network from "./lib/network.js";
import Transaction from "./lib/transaction.js";

export { Utils, Crypto };
export default class Archethic {
  constructor(endpoint) {
    this.endpoint = new URL(endpoint);

    this.transaction = new Transaction(this);
    this.account = new Account(this);
    this.network = new Network(this);
    this.nearestEndpoints = [endpoint];
  }

  async connect() {
    const nodes = await getNearestEndpoints(this.endpoint);

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
