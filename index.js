import { getNearestEndpoints } from "./lib/api";
import * as Utils from "./lib/utils";
import * as Crypto from "./lib/crypto";
import Account from "./lib/account";
import Network from "./lib/network";
import Transaction from "./lib/transaction";

export { Utils, Crypto };
export default class Archethic {
  constructor(endpoint) {
    this.endpoint = new URL(endpoint);

    this.transaction = new Transaction(this);
    this.account = new Account(this);
    this.network = new Network(this);
  }

  async connect() {
    const nodes = await getNearestEndpoints(this.endpoint);
    this.nearestEndpoints = nodes.map(({ ip, port }) => {
      return `http://${ip}:${port}`;
    });

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
