import { ContractAction } from "./types.js";
import { encryptSecret, deriveAddress } from "./crypto.js";
import { ExtendedTransactionBuilder } from "./transaction.js";
import Archethic from "./index.js";
import { hexToUint8Array, isHex } from "./utils.js";

export async function extractActionsFromContract(code: string): Promise<ContractAction[]> {
  let actions = [];

  if (isHex(code)) {
    const wasmModule = await WebAssembly.instantiate(hexToUint8Array(code), {
      "archethic/env": {
        log: (offset: bigint, length: bigint) => {},
        store_u8: (offset: bigint, data: bigint) => {},
        input_load_u8: (offset: bigint): number => 0,
        input_size: (): bigint => 0n,
        alloc: (length: bigint): bigint => 0n,
        set_output: (offset: bigint, length: bigint) => {},
        set_error: (offset: bigint, length: bigint) => {}
      }
    });

    const reservedFunctions = ["spec", "init", "onUpgrade"];
    for (let key in wasmModule.instance.exports) {
      if (wasmModule.instance.exports[key] instanceof Function) {
        if (!reservedFunctions.includes(key)) {
          actions.push({ name: key, parameters: ["WASM JSON Input"] });
        }
      }
    }

    actions.push({ name: "upgrade", parameters: ['WASM JSON Input ( {"code": "wasm code as hex"})'] });

    return actions;
  }

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
