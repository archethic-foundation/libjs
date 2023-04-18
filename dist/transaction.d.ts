import TransactionBuilder from "./transaction_builder.js";
import TransactionSender from "./transaction_sender.js";
import Archethic from "./index.js";
import { Ownership } from "./types.js";
export default class Transaction {
    core: Archethic;
    builder: typeof ExtendedTransactionBuilder;
    constructor(core: Archethic);
    new(): ExtendedTransactionBuilder;
    getTransactionIndex(address: string | Uint8Array): Promise<number>;
    getTransactionFee(tx: TransactionBuilder): Promise<any>;
    getTransactionOwnerships(address: string | Uint8Array, last?: boolean): Promise<Ownership[]>;
}
export declare class ExtendedTransactionBuilder extends TransactionBuilder {
    core: Archethic;
    sender: TransactionSender;
    constructor(core: Archethic);
    send(confirmationThreshold: number, timeout: number): void;
    on(eventName: string, fun: Function): this;
    unsubscribe(eventName: string): this;
}
