import TransactionBuilder from "./transaction_builder.js";
import TransactionSender from "./transaction_sender.js";

import * as API from "./api.js";
import Archethic from "./index.js";
import { Ownership, TransactionFee } from "./types.js";

export default class Transaction {
  core: Archethic;
  builder = ExtendedTransactionBuilder;
  constructor(core: Archethic) {
    this.core = core;
  }

  new(): ExtendedTransactionBuilder {
    return new this.builder(this.core);
  }

  send(tx: TransactionBuilder) {
    return this.core.rpcNode!.sendTransaction(tx);
  }

  getTransactionIndex(address: string | Uint8Array): Promise<number> {
    return this.core.requestNode((endpoint) => API.getTransactionIndex(address, endpoint));
  }

  getTransactionFee(tx: TransactionBuilder): Promise<TransactionFee> {
    return this.core.rpcNode!.getTransactionFee(tx);
  }

  getTransactionOwnerships(address: string | Uint8Array, last = false): Promise<Ownership[]> {
    return this.core.requestNode((endpoint) => API.getTransactionOwnerships(address, endpoint, last));
  }
}

export class ExtendedTransactionBuilder extends TransactionBuilder {
  core: Archethic;
  sender: TransactionSender;
  constructor(core: Archethic) {
    super();
    this.core = core;
    this.sender = new TransactionSender(this.core);
  }

  //Override TransactionSender.send to use the node resolution
  send(confirmationThreshold: number, timeout: number) {
    this.core.requestNode((endpoint) => this.sender.send(this, endpoint, confirmationThreshold, timeout));
  }

  //Use of composition as multi inheritance model
  on(eventName: string, fun: Function) {
    this.sender.on(eventName, fun);
    return this;
  }

  unsubscribe(eventName: string) {
    this.sender.unsubscribe(eventName);
    return this;
  }
}
