import { ContractAction, TransactionData } from "./types.js";
import { encryptSecret, deriveAddress } from "./crypto.js";
import { ExtendedTransactionBuilder } from "./transaction.js";
import Archethic from "./index.js";
import { deflateRaw } from "pako";

export type ContractManifest = {
  abi: WasmABI;
};

export type WasmABI = {
  state: Record<string, string>;
  functions: Record<string, WASMFunctionABI>;
};

export type WASMFunctionABI = {
  type: string;
  triggerType?: string;
  input: Record<string, any>;
};

export function extractActionsFromContract(code: string): ContractAction[] {
  let actions = [];

  const regex = /actions\s+triggered_by:\s+transaction,\s+on:\s+([\w\s.,()]+?)\s+do/g;

  for (const match of code.matchAll(regex)) {
    const fullAction = match[1];

    const regexActionName = /(\w+)\((.*?)\)/g;
    for (const actionMatch of fullAction.matchAll(regexActionName)) {
      const name = actionMatch[1];
      const parameters = actionMatch[2] != "" ? actionMatch[2].split(",") : [];
      actions.push({
        name: name,
        parameters: parameters
      });
    }
  }

  return actions;
}

export function parseTypedArgument(input: any): any {
  // Check if input is an object
  if (typeof input === "object") {
    return input; // Return input as is
  } else if (!isNaN(input)) {
    // Check if input is a number
    return parseFloat(input); // Parse input as a float
  } else {
    return input; // Return input as string
  }
}

/**
Create a new transaction to deploy a smart contract

This function abstract the wrapping of encrypted keys towards the node's shared key
*/
export async function newContractTransaction(
  archethic: Archethic,
  contract: Contract,
  seed: string | Uint8Array,
  txData?: TransactionData
): Promise<ExtendedTransactionBuilder> {
  const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
  const index = await archethic.transaction.getTransactionIndex(deriveAddress(seed, 0));

  const { encryptedSecret, authorizedKeys } = encryptSecret(seed, storageNoncePublicKey);

  const tx = archethic.transaction
    .new()
    .setType("contract")
    .setContract(contract)
    .addOwnership(encryptedSecret, authorizedKeys);

  if (txData) {
    if (txData.ledger && txData.ledger.uco) txData.ledger.uco.transfers.forEach((t) => tx.addUCOTransfer(t.to, t.amount));
    if (txData.ledger && txData.ledger.token) txData.ledger.token.transfers.forEach((t) => tx.addTokenTransfer(t.to, t.amount, t.tokenAddress, t.tokenId));
    if (txData.recipients) txData.recipients.forEach((r2) => tx.addRecipient(r2.address, r2.action, r2.args));
    if (txData.content) tx.setContent(txData.content);
  }

  return tx.build(seed, index);
}

export function updateContractTransaction(
  archethic: Archethic,
  contractAddress: string,
  contract: Contract
): ExtendedTransactionBuilder {
  return archethic.transaction
    .new()
    .setType("transfer")
    .addRecipient(contractAddress, "upgrade", contract);
}

export class Contract {
  bytecode: Uint8Array;
  manifest: ContractManifest;

  constructor(bytecode: Uint8Array, manifest: ContractManifest, compress: boolean = true) {
    this.bytecode = compress ? deflateRaw(bytecode) : bytecode;
    this.manifest = manifest;
  }

  getActions(): ContractAction[] {
    let actions: ContractAction[] = [];
    for (let name of Object.keys(this.manifest.abi.functions)) {
      const functionABI = this.manifest.abi.functions[name];
      console.log(functionABI)
      if (functionABI.type == "action" && functionABI.triggerType == "transaction") {
        actions.push({
          name: name,
          parameters: functionABI.input ? Object.keys(functionABI.input) : []
        });
      }
    }
    return actions;
  }
}
