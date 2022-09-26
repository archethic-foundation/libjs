import TransactionBuilder from "./transaction_builder.js";
import TransactionSender from "./transaction_sender.js";

import * as API from "./api.js";

export default class Transaction {
  constructor(core) {
    this.core = core;
    this.builder = ExtendedTransactionBuilder;
  }

  new() {
    return new this.builder(this.core)
  }

  getTransactionIndex(address) {
    return this.core.requestNode((endpoint) =>
      API.getTransactionIndex(address, endpoint)
    );
  }

  getTransactionFee(tx) {
    return this.core.requestNode((endpoint) =>
      API.getTransactionFee(tx, endpoint)
    );
  }

  getTransactionOwnerships(address) {
    return this.core.requestNode((endpoint) =>
      API.getTransactionOwnerships(address, endpoint)
    );
  }
};

class ExtendedTransactionBuilder extends TransactionBuilder {
  constructor(core) {
    super();
    this.core = core;
    this.sender = new TransactionSender();
  }

  //Override TransactionSender.send to use the node resolution
  send(confirmationThreshold, timeout) {
    this.core.requestNode((endpoint) =>
      this.sender.send(this, endpoint, confirmationThreshold, timeout)
    );
  }

  //Use of composition as multi inheritance model
  on(eventName, fun) {
    this.sender.on(eventName, fun);
    return this;
  }

  unsubscribe(eventName) {
    this.sender.unsubscribe(eventName);
    return this;
  }
}
