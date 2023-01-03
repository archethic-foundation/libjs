import Keychain from "./keychain.js";
import {
  randomSecretKey,
  ecEncrypt,
  ecDecrypt,
  deriveAddress,
  aesEncrypt,
  aesDecrypt,
  deriveKeyPair,
} from "./crypto.js";
import { uint8ArrayToHex, hexToUint8Array } from "./utils.js";

export default class Account {
  constructor(core) {
    this.core = core;
  }

  newKeychainTransaction(keychain, transactionChainIndex) {
    const aesKey = randomSecretKey();

    return new this.core.transaction.builder(this.core)
      .setType("keychain")
      .setContent(JSON.stringify(keychain.toDID()))
      .addOwnership(aesEncrypt(keychain.encode(), aesKey), keychain.authorizedPublicKeys.map((key) => {
        return { publicKey: key, encryptedSecretKey: ecEncrypt(aesKey, key) };
      }))
      .build(keychain.seed, transactionChainIndex);
  }

  newAccessTransaction(seed, keychainAddress) {
    const aesKey = randomSecretKey();

    const { publicKey } = deriveKeyPair(seed, 0);

    const encryptedSecretKey = ecEncrypt(aesKey, publicKey);

    const authorizedKeys = [
      {
        publicKey: publicKey,
        encryptedSecretKey: encryptedSecretKey,
      },
    ];

    return new this.core.transaction.builder(this.core)
      .setType("keychain_access")
      .addOwnership(aesEncrypt(keychainAddress, aesKey), authorizedKeys)
      .build(seed, 0);
  }

  async getKeychain(seed) {
    const { publicKey: accessPublicKey, privateKey: accessPrivateKey } =
      deriveKeyPair(seed, 0);
    const accessKeychainAddress = deriveAddress(seed, 1);

    //Download the encrypted data from the access transaction
    const accessOwnerships =
      await this.core.transaction.getTransactionOwnerships(
        accessKeychainAddress
      );

    if (accessOwnerships.length == 0) {
      throw "Keychain doesn't exist";
    }

    const { secret: accessSecret, authorizedPublicKeys: accessAuthorizedKeys } =
      accessOwnerships[0];

    const { encryptedSecretKey: accessSecretKey } = accessAuthorizedKeys.find(
      (authKey) => {
        return (
          authKey.publicKey.toLocaleUpperCase() ==
          uint8ArrayToHex(accessPublicKey).toLocaleUpperCase()
        );
      }
    );

    // Decrypt the keychain address within the access's transaction secret
    const accessAESKey = ecDecrypt(accessSecretKey, accessPrivateKey);
    const keychainGenesisAddress = aesDecrypt(accessSecret, accessAESKey);

    // Download the encrypted data from the keychain transaction
    const keychainOwnerships =
      await this.core.transaction.getTransactionOwnerships(keychainGenesisAddress, true);

    const {
      secret: keychainSecret,
      authorizedPublicKeys: keychainAuthorizedKeys,
    } = keychainOwnerships[0];
    const { encryptedSecretKey: keychainSecretKey } =
      keychainAuthorizedKeys.find(
        ({ publicKey }) =>
          publicKey.toUpperCase() ==
          uint8ArrayToHex(accessPublicKey).toUpperCase()
      );

    // Decrypt the keychain
    const keychainAESKey = ecDecrypt(keychainSecretKey, accessPrivateKey);
    const encodedKeychain = aesDecrypt(keychainSecret, keychainAESKey);

    let keychain = Keychain.decode(encodedKeychain);

    keychainAuthorizedKeys.forEach(({ publicKey }) => {
      keychain.addAuthorizedPublicKey(hexToUint8Array(publicKey));
    });

    return keychain;
  }
};
