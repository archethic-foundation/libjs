import Archethic from "./index.js";
import ActionSender, { ActionResult, ActionSenderOptions } from "./action_sender.js";

export default class ContractManager {
  private core: Archethic;

  constructor(core: Archethic) {
    this.core = core;
  }

  /**
   * Call a read-only public function on a contract (no transaction, instant)
   */
  async callFunction(contractAddress: string, functionName: string, args: any[] = []): Promise<any> {
    return this.core.rpcNode!.callFunction(contractAddress, functionName, args);
  }

  /**
   * Send an action to a contract with full lifecycle tracking.
   *
   * Events:
   *   - "sent": caller TX submitted
   *   - "actionConfirmed": caller TX reached required confirmations
   *   - "stateUpdated": contract output TX mined (state available)
   *   - "error": error at any phase
   *   - "timeout": overall or poll timeout exceeded
   *
   * @example
   * archethic.contract
   *   .sendAction("0000...", "inc", { value: 5 }, seed, {
   *     stateFunction: "getCounter"
   *   })
   *   .on("actionConfirmed", (txAddr) => console.log("Action confirmed:", txAddr))
   *   .on("stateUpdated", ({ state }) => console.log("New state:", state))
   *   .on("error", (ctx, err) => console.error(err))
   *   .send();
   */
  sendAction(
    contractAddress: string,
    action: string,
    args: object,
    seed: string | Uint8Array,
    options?: ActionSenderOptions
  ): ActionSender {
    return new ActionSender(this.core, contractAddress, action, args, seed, options);
  }

  /**
   * Send an action and wait for the contract state to be updated.
   * Returns a promise that resolves when the contract output TX is mined.
   *
   * @example
   * const { actionTxAddress, state } = await archethic.contract.sendActionAndWait(
   *   "0000...", "inc", { value: 5 }, seed,
   *   { stateFunction: "getCounter" }
   * );
   * console.log("Counter:", state);
   */
  async sendActionAndWait(
    contractAddress: string,
    action: string,
    args: object,
    seed: string | Uint8Array,
    options?: ActionSenderOptions
  ): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      const sender = this.sendAction(contractAddress, action, args, seed, options);

      sender
        .on("stateUpdated", (result: ActionResult) => resolve(result))
        .on("error", (_ctx: string, err: any) => reject(new Error(err.message || err.data || JSON.stringify(err))))
        .on("timeout", () => reject(new Error("Action timed out waiting for state update")));

      sender.send();
    });
  }
}
