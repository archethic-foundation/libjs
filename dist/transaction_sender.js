import fetch from "cross-fetch";
import { maybeUint8ArrayToHex, uint8ArrayToHex } from "./utils.js";
import absinthe from "./api/absinthe.js";
const senderContext = "SENDER";
export default class TransactionSender {
    onSent;
    onConfirmation;
    onFullConfirmation;
    onRequiredConfirmation;
    onError;
    onTimeout;
    confirmationNotifier;
    errorNotifier;
    absintheSocket;
    nbConfirmationReceived;
    timeout;
    constructor() {
        this.onSent = [];
        this.onConfirmation = [];
        this.onFullConfirmation = [];
        this.onRequiredConfirmation = [];
        this.onError = [];
        this.onTimeout = [];
        this.confirmationNotifier =
            this.errorNotifier = undefined;
        this.absintheSocket = undefined;
        this.timeout = undefined;
        this.nbConfirmationReceived = 0;
        return this;
    }
    on(event, func) {
        switch (event) {
            case "sent":
                this.onSent.push(func);
                break;
            case "confirmation":
                this.onConfirmation.push(func);
                break;
            case "requiredConfirmation":
                this.onRequiredConfirmation.push(func);
                break;
            case "fullConfirmation":
                this.onFullConfirmation.push(func);
                break;
            case "error":
                this.onError.push(func);
                break;
            case "timeout":
                this.onTimeout.push(func);
                break;
            default:
                throw "Event " + event + " is not supported";
        }
        return this;
    }
    async send(tx, endpoint, confirmationThreshold = 100, timeout = 60) {
        if (confirmationThreshold < 0 && confirmationThreshold > 100) {
            throw "'confirmationThreshold' must be an integer between 0 and 100";
        }
        if (timeout <= 0) {
            throw "'timeout' must be an integer greater than 0";
        }
        const txAddress = uint8ArrayToHex(tx.address);
        const { host, protocol } = new URL(endpoint);
        const ws_protocol = protocol == "https:" ? "wss" : "ws";
        this.absintheSocket = absinthe.create(`${ws_protocol}://${host}/socket`);
        try {
            this.confirmationNotifier = await waitConfirmations(txAddress, this.absintheSocket, (nbConf, maxConf) => handleConfirmation.call(this, confirmationThreshold, nbConf, maxConf));
            this.errorNotifier = await waitError(txAddress, this.absintheSocket, handleError.bind(this));
        }
        catch (err) {
            this.onError.forEach((func) => func(senderContext, err.message, this));
            return this;
        }
        fetch(endpoint + "/api/transaction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: tx.toJSON(),
        })
            .then((response) => handleSend.call(this, timeout, response))
            .catch((err) => this.onError.forEach((func) => func(senderContext, err, this)));
        return this;
    }
    unsubscribe(event = undefined) {
        if (event) {
            switch (event) {
                case "sent":
                    this.onSent = [];
                    break;
                case "confirmation":
                    this.onConfirmation = [];
                    absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
                    break;
                case "requiredConfirmation":
                    this.onRequiredConfirmation = [];
                    absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
                    break;
                case "fullConfirmation":
                    this.onFullConfirmation = [];
                    absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
                    break;
                case "error":
                    this.onError = [];
                    absinthe.cancel(this.absintheSocket, this.errorNotifier);
                    break;
                case "timeout":
                    this.onTimeout = [];
                    break;
                default:
                    throw "Event " + event + " is not supported";
            }
        }
        else {
            absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
            absinthe.cancel(this.absintheSocket, this.errorNotifier);
            this.onConfirmation = [];
            this.onFullConfirmation = [];
            this.onRequiredConfirmation = [];
            this.onError = [];
            this.onTimeout = [];
            this.onSent = [];
        }
    }
}
async function waitConfirmations(address, absintheSocket, handler) {
    const operation = `
    subscription {
      transactionConfirmed(address: "${maybeUint8ArrayToHex(address)}") {
        nbConfirmations,
        maxConfirmations
      }
    }
    `;
    const notifier = absinthe.send(absintheSocket, operation);
    return absinthe.observe(absintheSocket, notifier, (result) => {
        if (result.data.transactionConfirmed) {
            const { nbConfirmations: nbConfirmations, maxConfirmations: maxConfirmations, } = result.data.transactionConfirmed;
            handler(nbConfirmations, maxConfirmations);
        }
    });
}
async function waitError(address, absintheSocket, handler) {
    const operation = `
    subscription {
      transactionError(address: "${maybeUint8ArrayToHex(address)}") {
        context,
        reason
      }
    }
    `;
    const notifier = absinthe.send(absintheSocket, operation);
    return absinthe.observe(absintheSocket, notifier, (result) => {
        if (result.data.transactionError) {
            const { context: context, reason: reason } = result.data.transactionError;
            handler(context, reason);
        }
    });
}
function handleConfirmation(confirmationThreshold, nbConfirmations, maxConfirmations) {
    this.nbConfirmationReceived = nbConfirmations;
    if (nbConfirmations == 1)
        absinthe.cancel(this.absintheSocket, this.errorNotifier);
    this.onConfirmation.forEach((func) => func(nbConfirmations, maxConfirmations, this));
    if (maxConfirmations * (confirmationThreshold / 100) <= nbConfirmations &&
        this.onRequiredConfirmation.length > 0) {
        this.onRequiredConfirmation.forEach((func) => func(nbConfirmations, this));
        this.onRequiredConfirmation = [];
        clearTimeout(this.timeout);
    }
    if (nbConfirmations == maxConfirmations) {
        clearTimeout(this.timeout);
        absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
        this.onFullConfirmation.forEach((func) => func(maxConfirmations, this));
    }
}
function handleError(context, reason) {
    clearTimeout(this.timeout);
    absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
    absinthe.cancel(this.absintheSocket, this.errorNotifier);
    this.onError.forEach((func) => func(context, reason, this));
}
function handleSend(timeout, response) {
    if (response.status >= 200 && response.status <= 299) {
        this.onSent.forEach((func) => func(this));
        this.timeout = setTimeout(() => {
            absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
            absinthe.cancel(this.absintheSocket, this.errorNotifier);
            this.onTimeout.forEach((func) => func(this.nbConfirmationReceived, this));
        }, timeout * 1_000);
    }
    else {
        absinthe.cancel(this.absintheSocket, this.confirmationNotifier);
        absinthe.cancel(this.absintheSocket, this.errorNotifier);
        response
            .json()
            .then((err) => this.onError.forEach((func) => func(senderContext, err.status, this)));
    }
}
//# sourceMappingURL=transaction_sender.js.map