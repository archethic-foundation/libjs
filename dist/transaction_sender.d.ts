/// <reference types="node" />
import TransactionBuilder from "./transaction_builder.js";
import { AbsintheSocket } from "@absinthe/socket";
export default class TransactionSender {
    onSent: Function[];
    onConfirmation: Function[];
    onFullConfirmation: Function[];
    onRequiredConfirmation: Function[];
    onError: Function[];
    onTimeout: Function[];
    confirmationNotifier: any;
    errorNotifier: any;
    absintheSocket: AbsintheSocket | undefined;
    nbConfirmationReceived: number;
    timeout: NodeJS.Timeout | undefined;
    constructor();
    on(event: string, func: Function): this;
    send(tx: TransactionBuilder, endpoint: string, confirmationThreshold?: number, timeout?: number): Promise<this>;
    unsubscribe(event?: string | undefined): void;
}
