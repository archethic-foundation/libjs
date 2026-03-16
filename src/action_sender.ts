import Archethic from "./index.js";
import { deriveAddress } from "./crypto.js";
import { uint8ArrayToHex } from "./utils.js";
import { originPrivateKey } from "./utils.js";

export type ActionSenderEvent =
  | "sent"
  | "actionConfirmed"
  | "stateUpdated"
  | "error"
  | "timeout";

export type ActionResult = {
  actionTxAddress: string;
  state: any;
};

export type ActionSenderOptions = {
  confirmationThreshold?: number; // 0-100, default 100
  timeout?: number; // overall timeout in seconds, default 90
  pollInterval?: number; // ms between state polls, default 3000
  pollTimeout?: number; // max ms to wait for state update after actionConfirmed, default 60000
  stateFunction?: string; // function to call to detect state change (e.g. "getCounter")
  stateFunctionArgs?: any[]; // args for the state function
};

const DEFAULTS: Required<ActionSenderOptions> = {
  confirmationThreshold: 100,
  timeout: 90,
  pollInterval: 3000,
  pollTimeout: 60000,
  stateFunction: "",
  stateFunctionArgs: []
};

type EventHandlers = {
  sent: Function[];
  actionConfirmed: Function[];
  stateUpdated: Function[];
  error: Function[];
  timeout: Function[];
};

export default class ActionSender {
  private core: Archethic;
  private contractAddress: string;
  private action: string;
  private args: object;
  private seed: string | Uint8Array;
  private opts: Required<ActionSenderOptions>;
  private handlers: EventHandlers;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private overallTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    core: Archethic,
    contractAddress: string,
    action: string,
    args: object,
    seed: string | Uint8Array,
    options?: ActionSenderOptions
  ) {
    this.core = core;
    this.contractAddress = contractAddress;
    this.action = action;
    this.args = args;
    this.seed = seed;
    this.opts = { ...DEFAULTS, ...options };
    this.handlers = {
      sent: [],
      actionConfirmed: [],
      stateUpdated: [],
      error: [],
      timeout: []
    };
  }

  on(event: ActionSenderEvent, handler: Function): this {
    if (!this.handlers[event]) throw new Error(`Unknown event: ${event}`);
    this.handlers[event].push(handler);
    return this;
  }

  private emit(event: ActionSenderEvent, ...args: any[]) {
    this.handlers[event].forEach((fn) => fn(...args));
  }

  private cleanup() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.overallTimer) clearTimeout(this.overallTimer);
    this.pollTimer = undefined;
    this.overallTimer = undefined;
  }

  async send(): Promise<void> {
    try {
      // Get sender index
      const genesisAddress = uint8ArrayToHex(deriveAddress(this.seed, 0));
      const txIndex = await this.core.transaction.getTransactionIndex(genesisAddress);

      // Capture baseline chain length of the contract
      const baselineChainLength = await this.core.transaction.getTransactionIndex(this.contractAddress);

      // Build TX
      const tx = this.core.transaction
        .new()
        .setType("transfer")
        .addRecipient(this.contractAddress, this.action, this.args)
        .build(this.seed, txIndex)
        .originSign(originPrivateKey);

      // Overall timeout
      this.overallTimer = setTimeout(() => {
        this.cleanup();
        this.emit("timeout");
      }, this.opts.timeout * 1000);

      // Wire TX events and send
      tx.on("sent", () => this.emit("sent"))
        .on("requiredConfirmation", () => {
          const actionTxAddress = uint8ArrayToHex(tx.address);
          this.emit("actionConfirmed", actionTxAddress);
          this.startPolling(actionTxAddress, baselineChainLength);
        })
        .on("error", (ctx: string, err: any) => {
          this.cleanup();
          this.emit("error", ctx, err);
        })
        .on("timeout", () => {
          this.cleanup();
          this.emit("timeout");
        })
        .send(this.opts.confirmationThreshold, this.opts.timeout);
    } catch (err: any) {
      this.cleanup();
      this.emit("error", "SETUP", { message: err.message || String(err) });
    }
  }

  private startPolling(actionTxAddress: string, baselineChainLength: number) {
    const pollStart = Date.now();

    this.pollTimer = setInterval(async () => {
      try {
        // Check if poll timeout exceeded
        if (Date.now() - pollStart > this.opts.pollTimeout) {
          this.cleanup();
          this.emit("timeout");
          return;
        }

        // Check if contract chain has grown
        const currentChainLength = await this.core.transaction.getTransactionIndex(this.contractAddress);

        if (currentChainLength > baselineChainLength) {
          // State updated - fetch state if a function is specified
          let state: any = undefined;
          if (this.opts.stateFunction) {
            state = await this.core.rpcNode!.callFunction(
              this.contractAddress,
              this.opts.stateFunction,
              this.opts.stateFunctionArgs
            );
          }

          this.cleanup();
          this.emit("stateUpdated", { actionTxAddress, state });
        }
      } catch (_) {
        // Ignore poll errors, retry on next interval
      }
    }, this.opts.pollInterval);
  }
}
