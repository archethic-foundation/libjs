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

  // TODO: move into keychain.js by passing `this` in ctor?
  // Write a new keychain transaction in the network
  async updateKeychain(keychain, timeoutSeconds = 5) {
    const keychainGenesisAddress = Crypto.deriveAddress(keychain.seed, 0);
    const transactionChainIndex = await this.transaction.getTransactionIndex(keychainGenesisAddress);

    const aesKey = Crypto.randomSecretKey();

    return new Promise((resolve, reject) => {
      new this.transaction.builder(this)
        .setType("keychain")
        .setContent(JSON.stringify(keychain.toDID()))
        .addOwnership(
          Crypto.aesEncrypt(keychain.encode(), aesKey),
          keychain.authorizedPublicKeys.map(publicKey => {
            return { publicKey: publicKey, encryptedSecretKey: Crypto.ecEncrypt(aesKey, publicKey) }
          })
        )
        .build(keychain.seed, transactionChainIndex)
        .originSign(Utils.originPrivateKey)
        .on("confirmation", (confirmations, maxConfirmations, sender) => {
          resolve();
        })
        .on("error", (context, reason) => {
          reject(reason);
        })
        .on("timeout", (nbConf) => {
          reject(new Error("timeout"));
        })
        .send(timeoutSeconds);
    })
  }
}
