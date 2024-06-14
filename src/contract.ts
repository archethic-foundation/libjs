import { ContractAction } from "./types.js";
import { encryptSecret, deriveAddress } from "./crypto.js";
import { ExtendedTransactionBuilder } from "./transaction.js";
import Archethic from "./index.js";

export function extractActionsFromContract(code: string): ContractAction[] {
  const regex = /actions\s+triggered_by:\s+transaction,\s+on:\s+([\w\s.,()]+?)\s+do/g;

  let actions = [];
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
  code: string,
  seed: string | Uint8Array
): Promise<ExtendedTransactionBuilder> {
  const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
  const index = await archethic.transaction.getTransactionIndex(deriveAddress(seed, 0));

  const { encryptedSecret, authorizedKeys } = encryptSecret(seed, storageNoncePublicKey);
  return archethic.transaction
    .new()
    .setType("contract")
    .setCode(code)
    .addOwnership(encryptedSecret, authorizedKeys)
    .build(seed, index);
}
