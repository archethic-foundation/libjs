import { maybeUint8ArrayToHex, uint8ArrayToHex } from "./utils.js";
import absinthe from "./api/absinthe.js";
import TransactionBuilder from "./transaction_builder.js";
import { AbsintheSocket } from "@absinthe/socket";
import Archethic from "./index.js";

const senderContext = "SENDER";

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
  core: Archethic;
  constructor(archethic: Archethic) {
    this.core = archethic;

    this.onSent = [];
    this.onConfirmation = [];
    this.onFullConfirmation = [];
    this.onRequiredConfirmation = [];
    this.onError = [];
    this.onTimeout = [];

    this.confirmationNotifier = undefined;
    this.errorNotifier = undefined;
    this.absintheSocket = undefined;

    this.timeout = undefined;
    this.nbConfirmationReceived = 0;
  }

  /**
   * Add listener on specific event
   * @param {String} event Event to subscribe
   * @param {Function} func Function to call when event triggered
   */
  on(event: string, func: Function) {
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
        throw new Error("Event " + event + " is not supported");
    }

    return this;
  }

  async send(tx: TransactionBuilder, endpoint: string, confirmationThreshold: number = 100, timeout: number = 60) {
    if (confirmationThreshold < 0 || confirmationThreshold > 100) {
      throw new Error("'confirmationThreshold' must be an integer between 0 and 100");
    }

    if (timeout <= 0) {
      throw new Error("'timeout' must be an integer greater than 0");
    }

    const txAddress = uint8ArrayToHex(tx.address);

    // Create web socket
    const { host, protocol } = new URL(endpoint);
    const ws_protocol = protocol == "https:" ? "wss" : "ws";

    this.absintheSocket = absinthe.create(`${ws_protocol}://${host}/socket`);

    try {
      this.confirmationNotifier = await waitConfirmations(
        txAddress,
        this.absintheSocket,
        (nbConf: number, maxConf: number) => handleConfirmation.call(this, confirmationThreshold, nbConf, maxConf)
      );
      this.errorNotifier = await waitError(txAddress, this.absintheSocket, handleError.bind(this));
    } catch (err: any) {
      this.onError.forEach((func) => func(senderContext, err.message, this));
      return this;
    }

    this.core
      .rpcNode!.sendTransaction(tx)
      .then(() => {
        handleSend.call(this, timeout);
      })
      .catch((err) => handleError.call(this, senderContext, err));

    return this;
  }

  unsubscribe(event: string | undefined = undefined) {
    if (event) {
      switch (event) {
        case "sent":
          this.onSent = [];
          break;

        case "confirmation":
          this.onConfirmation = [];
          absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
          break;

        case "requiredConfirmation":
          this.onRequiredConfirmation = [];
          absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
          break;

        case "fullConfirmation":
          this.onFullConfirmation = [];
          absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
          break;

        case "error":
          this.onError = [];
          absinthe.cancel(this.absintheSocket as AbsintheSocket, this.errorNotifier);
          break;

        case "timeout":
          this.onTimeout = [];
          break;

        default:
          throw new Error("Event " + event + " is not supported");
      }
    } else {
      absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
      absinthe.cancel(this.absintheSocket as AbsintheSocket, this.errorNotifier);
      this.onConfirmation = [];
      this.onFullConfirmation = [];
      this.onRequiredConfirmation = [];
      this.onError = [];
      this.onTimeout = [];
      this.onSent = [];
    }
  }
}

async function waitConfirmations(
  address: string | Uint8Array,
  absintheSocket: AbsintheSocket,
  handler: any
): Promise<any> {
  const operation = `
    subscription {
      transactionConfirmed(address: "${maybeUint8ArrayToHex(address)}") {
        nbConfirmations,
        maxConfirmations
      }
    }
    `;
  const notifier = absinthe.send(absintheSocket, operation);
  return absinthe.observe(absintheSocket, notifier, (result: any) => {
    if (result.data.transactionConfirmed) {
      const { nbConfirmations: nbConfirmations, maxConfirmations: maxConfirmations } = result.data.transactionConfirmed;

      handler(nbConfirmations, maxConfirmations);
    }
  });
}

async function waitError(address: string | Uint8Array, absintheSocket: any, handler: Function): Promise<unknown> {
  const operation = `
    subscription {
      transactionError(address: "${maybeUint8ArrayToHex(address)}") {
        context,
        reason
      }
    }
    `;
  const notifier = absinthe.send(absintheSocket, operation);
  return absinthe.observe(absintheSocket, notifier, (result: any) => {
    if (result.data.transactionError) {
      const { context: context, reason: reason } = result.data.transactionError;
      handler(context, reason);
    }
  });
}

function handleConfirmation(
  this: TransactionSender,
  confirmationThreshold: number,
  nbConfirmations: number,
  maxConfirmations: number
) {
  // Update nb confirmation received for timeout
  this.nbConfirmationReceived = nbConfirmations;

  // Unsubscribe to error on first confirmation
  if (nbConfirmations == 1) absinthe.cancel(this.absintheSocket as AbsintheSocket, this.errorNotifier);

  this.onConfirmation.forEach((func) => func(nbConfirmations, maxConfirmations, this));

  if (maxConfirmations * (confirmationThreshold / 100) <= nbConfirmations && this.onRequiredConfirmation.length > 0) {
    this.onRequiredConfirmation.forEach((func) => func(nbConfirmations, this));
    this.onRequiredConfirmation = [];
    clearTimeout(this.timeout);
  }

  if (nbConfirmations == maxConfirmations) {
    clearTimeout(this.timeout);

    absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);

    this.onFullConfirmation.forEach((func) => func(maxConfirmations, this));
  }
}

function handleError(this: TransactionSender, context: any, reason: any) {
  clearTimeout(this.timeout);

  // Unsubscribe to all subscriptions
  absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
  absinthe.cancel(this.absintheSocket as AbsintheSocket, this.errorNotifier);

  this.onError.forEach((func) => func(context, reason, this));
}

function handleSend(this: TransactionSender, timeout: number) {
  this.onSent.forEach((func) => func(this));
  // Setup 1 minute timeout
  this.timeout = setTimeout(() => {
    absinthe.cancel(this.absintheSocket as AbsintheSocket, this.confirmationNotifier);
    absinthe.cancel(this.absintheSocket as AbsintheSocket, this.errorNotifier);

    this.onTimeout.forEach((func) => func(this.nbConfirmationReceived, this));
  }, timeout * 1_000);
}
