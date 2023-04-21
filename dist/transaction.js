import TransactionBuilder from "./transaction_builder.js";
import TransactionSender from "./transaction_sender.js";
import * as API from "./api.js";
export default class Transaction {
    core;
    builder = ExtendedTransactionBuilder;
    constructor(core) {
        this.core = core;
    }
    new() {
        return new this.builder(this.core);
    }
    getTransactionIndex(address) {
        return this.core.requestNode((endpoint) => API.getTransactionIndex(address, endpoint));
    }
    getTransactionFee(tx) {
        return this.core.requestNode((endpoint) => API.getTransactionFee(tx, endpoint));
    }
    getTransactionOwnerships(address, last = false) {
        return this.core.requestNode((endpoint) => API.getTransactionOwnerships(address, endpoint, last));
    }
}
;
export class ExtendedTransactionBuilder extends TransactionBuilder {
    core;
    sender;
    constructor(core) {
        super();
        this.core = core;
        this.sender = new TransactionSender();
    }
    send(confirmationThreshold, timeout) {
        this.core.requestNode((endpoint) => this.sender.send(this, endpoint, confirmationThreshold, timeout));
    }
    on(eventName, fun) {
        this.sender.on(eventName, fun);
        return this;
    }
    unsubscribe(eventName) {
        this.sender.unsubscribe(eventName);
        return this;
    }
}
//# sourceMappingURL=transaction.js.map