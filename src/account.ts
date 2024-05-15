import Keychain from "./keychain.js";
import {
  aesDecrypt,
  aesEncrypt,
  deriveAddress,
  deriveKeyPair,
  ecDecrypt,
  ecEncrypt,
  randomSecretKey
} from "./crypto.js";
import { maybeUint8ArrayToHex, uint8ArrayToHex } from "./utils.js";
import Archethic from "./index.js";
import { ExtendedTransactionBuilder } from "./transaction.js";

/**
 * Account class to manage {@link Keychain | keychains}
 */
export default class Account {
  /** @private */
  core: Archethic;
  /** @hidden */
  constructor(core: Archethic) {
    this.core = core;
  }

  /**
   * Creates a new transaction to build (or update) a keychain by embedding the on-chain encrypted wallet
   * @param keychain - The keychain to create
   * @param transactionChainIndex - The index of the transaction created (0 for new keychain)
   * @returns An instance of the ExtendedTransactionBuilder
   * @example Keychain creation
   * ```ts
   * import Archethic, { Crypto, Keychain } from "@archethicjs/sdk";
   *
   * const accessSeed = "myseed";
   * const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
   * const keychain = new Keychain(Crypto.randomSecretKey())
   *   .addService("uco", "m/650'/0/0")
   *   .addAuthorizedPublicKey(publicKey);
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.account.newKeychainTransaction(keychain, 0);
   * // The transaction can then be signed with origin private key
   * ```
   *
   * @example Keychain update
   * ```ts
   * import Archethic, { Crypto } from "@archethicjs/sdk";
   *
   * const accessSeed = "myseed";
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * let keychain = await archethic.account.getKeychain(accessSeed);
   * keychain.addService("mywallet", "m/650'/1/0");
   *
   * // determine the new transaction index
   * const keychainGenesisAddress = Crypto.deriveAddress(keychain.seed, 0);
   * const transactionChainIndex = await archethic.transaction.getTransactionIndex(keychainGenesisAddress);
   *
   * const tx = archethic.account.newKeychainTransaction(keychain, transactionChainIndex);
   * // The transaction can then be signed with origin private key
   * ```
   */
  newKeychainTransaction(keychain: Keychain, transactionChainIndex: number): ExtendedTransactionBuilder {
    const aesKey = randomSecretKey();

    const authorizedKeys = keychain.authorizedPublicKeys.map((key) => {
      return {
        publicKey: uint8ArrayToHex(key),
        encryptedSecretKey: uint8ArrayToHex(ecEncrypt(aesKey, key))
      };
    });

    return new ExtendedTransactionBuilder(this.core)
      .setType("keychain")
      .setContent(JSON.stringify(keychain.toDID()))
      .addOwnership(aesEncrypt(keychain.encode(), aesKey), authorizedKeys)
      .build(keychain.seed, transactionChainIndex);
  }

  /**
   * Creates a new keychain access transaction to allow a seed and its key to access a keychain
   * @param seed - Keychain access's seed
   * @param keychainAddress - Keychain's tx address
   * @returns An instance of the ExtendedTransactionBuilder
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.account.newAccessTransaction("myseed", "0000AB...CD");
   *
   */
  newAccessTransaction(seed: string | Uint8Array, keychainAddress: string | Uint8Array): ExtendedTransactionBuilder {
    const aesKey = randomSecretKey();

    const { publicKey } = deriveKeyPair(seed, 0);

    const encryptedSecretKey = ecEncrypt(aesKey, publicKey);

    const authorizedKeys = [
      {
        publicKey: uint8ArrayToHex(publicKey),
        encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
      }
    ];

    return new ExtendedTransactionBuilder(this.core)
      .setType("keychain_access")
      .addOwnership(aesEncrypt(keychainAddress, aesKey), authorizedKeys)
      .build(seed, 0);
  }

  /**
   * Retrieve a keychain from the keychain access transaction and decrypt the wallet to retrieve the services associated
   * @param seed - Keychain access's seed
   * @returns The keychain object
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net")
   * await archethic.connect()
   * const keychain = await archethic.account.getKeychain("myseed")
   * ```
   */
  async getKeychain(seed: string | Uint8Array) {
    const { publicKey: accessPublicKey, privateKey: accessPrivateKey } = deriveKeyPair(seed, 0);
    const accessKeychainAddress = deriveAddress(seed, 1);

    //Download the encrypted data from the access transaction
    const accessOwnerships = await this.core.transaction.getTransactionOwnerships(
      uint8ArrayToHex(accessKeychainAddress)
    );

    if (accessOwnerships.length === 0) {
      throw new Error("Keychain doesn't exist");
    }

    const { secret: accessSecret, authorizedPublicKeys: accessAuthorizedKeys } = accessOwnerships[0];

    const foundAuthKey = accessAuthorizedKeys.find((authKey) => {
      return (
        maybeUint8ArrayToHex(authKey.publicKey).toLocaleUpperCase() ===
        maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase()
      );
    });
    // the ! means that we know that the key exists because ".find" can return undefined (never undefined in this case)
    const { encryptedSecretKey: accessSecretKey } = foundAuthKey!;

    // Decrypt the keychain address within the access's transaction secret
    const accessAESKey = ecDecrypt(accessSecretKey, accessPrivateKey);
    const keychainGenesisAddress = aesDecrypt(accessSecret, accessAESKey);

    // Download the encrypted data from the keychain transaction
    const keychainOwnerships = await this.core.transaction.getTransactionOwnerships(keychainGenesisAddress, true);

    const { secret: keychainSecret, authorizedPublicKeys: keychainAuthorizedKeys } = keychainOwnerships[0];

    // @ts-ignore
    const { encryptedSecretKey: keychainSecretKey } = keychainAuthorizedKeys.find(
      ({ publicKey }) =>
        maybeUint8ArrayToHex(publicKey).toLocaleUpperCase() ===
        maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase()
    );

    // Decrypt the keychain
    const keychainAESKey = ecDecrypt(keychainSecretKey, accessPrivateKey);
    const encodedKeychain = aesDecrypt(keychainSecret, keychainAESKey);

    const keychain = Keychain.decode(encodedKeychain);

    keychainAuthorizedKeys.forEach(({ publicKey }) => {
      keychain.addAuthorizedPublicKey(publicKey);
    });

    return keychain;
  }
}
