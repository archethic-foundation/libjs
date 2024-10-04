import { Contract, ContractAction, TransactionData } from "./types.js";
import { encryptSecret, deriveAddress } from "./crypto.js";
import { ExtendedTransactionBuilder } from "./transaction.js";
import Archethic from "./index.js";
import { isHex } from "./utils.js";

type CodeWithManifest = {
  bytecode: string;
  manifest: WasmManifest
}

type WasmManifest = {
  abi: WasmABI
}

type WasmABI = {
  functions: Record<string, WASMFunctionABI>
}

type WASMFunctionABI = {
  type: string;
  triggerType?: string;
  name: string;
  input: Record<string, any>
}

export async function extractActionsFromContract(code: string): Promise<ContractAction[]> {
  try {
    const codeWithManifest: CodeWithManifest = JSON.parse(code)
    const manifest = codeWithManifest.manifest
    let actions: ContractAction[] = []
    for (let name of Object.keys(manifest.abi.functions)) {
      const functionABI = manifest.abi.functions[name]
      if (functionABI.type == "action" && functionABI.triggerType == "transaction") {
        actions.push({
          name: name,
          parameters: functionABI.input ? Object.keys(functionABI.input) : []
       })
      }
    }
    return actions
  }
  catch(e) {
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
    .addOwnership(encryptedSecret, authorizedKeys)

  if (txData) {
    txData.ledger.uco.transfers.forEach(t => tx.addUCOTransfer(t.to, t.amount))
    txData.ledger.token.transfers.forEach(t => tx.addTokenTransfer(t.to, t.amount, t.tokenAddress, t.tokenId))
    txData.recipients.forEach(r => tx.addRecipient(r.address, r.action, r.args))
    tx.setContent(txData.content)
  }

  return tx.build(seed, index);
}
