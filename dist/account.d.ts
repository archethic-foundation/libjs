import Keychain from "./keychain.js";
import Archethic from "./index.js";
import { ExtendedTransactionBuilder } from "./transaction.js";
export default class Account {
    core: Archethic;
    constructor(core: Archethic);
    newKeychainTransaction(keychain: Keychain, transactionChainIndex: number): ExtendedTransactionBuilder;
    newAccessTransaction(seed: string | Uint8Array, keychainAddress: string | Uint8Array): ExtendedTransactionBuilder;
    getKeychain(seed: string | Uint8Array): Promise<Keychain>;
}
