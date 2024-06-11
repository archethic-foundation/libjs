import TransactionBuilder from "./transaction_builder.js";
import TransactionSender from "./transaction_sender.js";

import * as API from "./api.js";
import Archethic from "./index.js";
import { Ownership, TransactionFee } from "./types.js";
import { SendTransactionResponse } from "./api/types.js";

export default class Transaction {
  /** @private */
  core: Archethic;
  /** @private */
  builder = ExtendedTransactionBuilder;
  /** @hidden */
  constructor(core: Archethic) {
    this.core = core;
  }

  /**
   * Create a new transaction instance to build and to send to the network
   * @returns {ExtendedTransactionBuilder} The transaction builder
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.transaction.new();
   * ```
   */
  new(): ExtendedTransactionBuilder {
    return new this.builder(this.core);
  }

  /** @private */
  send(tx: TransactionBuilder): Promise<SendTransactionResponse> {
    return this.core.rpcNode!.sendTransaction(tx);
  }

  /**
   * Get the transaction index of an address
   * @param address The address to get the transaction index of
   * @returns {Promise<number>} The transaction index
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const txIndex = await archethic.transaction.getTransactionIndex("0000AB...CD");
   * ```
   */
  getTransactionIndex(address: string | Uint8Array): Promise<number> {
    return this.core.requestNode((endpoint) => API.getTransactionIndex(address, endpoint));
  }

  /**
   * Get the transaction fee of a transaction
   * @param tx The transaction to get the fee of
   * @returns {Promise<TransactionFee>} The transaction fee
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net")
   * await archethic.connect();
   * const tx = ...
   * const fee = await archethic.transaction.getTransactionFee(tx)
   * ```
   */
  getTransactionFee(tx: TransactionBuilder): Promise<TransactionFee> {
    return this.core.rpcNode!.getTransactionFee(tx);
  }

  /**
   * Query a node to find the ownerships (secrets and authorized keys) to given transaction's address
   * @param address The address to get the transaction ownerships of
   * @param last Get the last ownerships only (default: false)
   * @returns {Promise<Ownership[]>} The transaction ownerships
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = ...
   * const ownerships = await archethic.transaction.getTransactionOwnerships(tx.address);
   * ```
   */
  getTransactionOwnerships(address: string | Uint8Array, last = false): Promise<Ownership[]> {
    return this.core.requestNode((endpoint) => API.getTransactionOwnerships(address, endpoint, last));
  }
}

/** @category transaction */
export class ExtendedTransactionBuilder extends TransactionBuilder {
  /** @private */
  core: Archethic;
  /** @private */
  sender: TransactionSender;
  /** @hidden */
  constructor(core: Archethic) {
    super();
    this.core = core;
    this.sender = new TransactionSender(this.core);
  }

  /**
   * Send a transaction to the endpoint and subscribe the node to get confirmation or validation error.
   *
   * When an update of the validation is received from the subscription, some events are triggered and associated function are called (see function on bellow)
   * @param confirmationThreshold The number of confirmation required to consider the transaction as validated
   * @param timeout The maximum time to wait for the transaction to be validated
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
   *   .build("mysuperpassphraseorseed", 0)
   *   .originSign(privateKey)
   *   .on("confirmation", (nbConf, maxConf) => console.log(nbConf, maxConf))
   *   .send();
   * ```
   */
  send(confirmationThreshold?: number, timeout?: number): void {
    this.core.requestNode((endpoint) => this.sender.send(this, endpoint, confirmationThreshold, timeout));
  }

  /**
   * Subscribe to a specific event
   * @param eventName The {@link TransactionSender | event} to subscribe
   * @param fun The function to call when the event is triggered
   * @returns {ExtendedTransactionBuilder} The transaction builder
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
   *   .build("mysuperpassphraseorseed", 0)
   *   .originSign(privateKey)
   *   .on("sent", () => console.log("transaction sent !"))
   *   .on("confirmation", (nbConf, maxConf) => console.log(nbConf, maxConf))
   *   .on("fullConfirmation", (nbConf) => console.log(nbConf))
   *   .on("requiredConfirmation", (nbConf) => console.log(nbConf))
   *   .on("error", (context, reason) => console.log(context, reason))
   *   .on("timeout", (nbConf) => console.log(nbConf))
   *   .send(60); // confirmationThreshold: 60
   * ```
   */
  on(eventName: string, fun: Function): ExtendedTransactionBuilder {
    this.sender.on(eventName, fun);
    return this;
  }

  /**
   * Unsubscribe to a specific event or all events
   * @param eventName The {@link TransactionSender | event} to unsubscribe. If not provided, all events are unsubscribed
   * @returns {ExtendedTransactionBuilder} The transaction builder
   */
  unsubscribe(eventName: string): ExtendedTransactionBuilder {
    this.sender.unsubscribe(eventName);
    return this;
  }
}
