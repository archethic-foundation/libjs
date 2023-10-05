import Keychain from "./keychain.js";
import { aesDecrypt, aesEncrypt, deriveAddress, deriveKeyPair, ecDecrypt, ecEncrypt, randomSecretKey, } from "./crypto.js";
import { maybeUint8ArrayToHex, uint8ArrayToHex } from "./utils.js";
import Archethic from "./index.js";
import { ExtendedTransactionBuilder } from "./transaction.js";

export default class Account {
    core: Archethic;
    constructor(core: Archethic) {
        this.core = core;
    }

    newKeychainTransaction(keychain: Keychain, transactionChainIndex: number): ExtendedTransactionBuilder {
        const aesKey = randomSecretKey();

        const authorizedKeys = keychain.authorizedPublicKeys.map((key) => {
            return {
                publicKey: uint8ArrayToHex(key),
                encryptedSecretKey: uint8ArrayToHex(ecEncrypt(aesKey, key))
            };
        });

        return new this.core.transaction.builder(this.core)
            .setType("keychain")
            .setContent(JSON.stringify(keychain.toDID()))
            .addOwnership(aesEncrypt(keychain.encode(), aesKey), authorizedKeys)
            .build(keychain.seed, transactionChainIndex);
    }

    newAccessTransaction(seed: string | Uint8Array, keychainAddress: string | Uint8Array): ExtendedTransactionBuilder {
        const aesKey = randomSecretKey();

        const { publicKey } = deriveKeyPair(seed, 0);

        const encryptedSecretKey = ecEncrypt(aesKey, publicKey);

        const authorizedKeys = [
            {
                publicKey: uint8ArrayToHex(publicKey),
                encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey),
            },
        ];

        return new this.core.transaction.builder(this.core)
            .setType("keychain_access")
            .addOwnership(aesEncrypt(keychainAddress, aesKey), authorizedKeys)
            .build(seed, 0);
    }

    async getKeychain(seed: string | Uint8Array) {
        const { publicKey: accessPublicKey, privateKey: accessPrivateKey } =
            deriveKeyPair(seed, 0);
        const accessKeychainAddress = deriveAddress(seed, 1);

        //Download the encrypted data from the access transaction
        const accessOwnerships =
            await this.core.transaction.getTransactionOwnerships(
                uint8ArrayToHex(accessKeychainAddress)
            );

        if (accessOwnerships.length == 0) {
            throw "Keychain doesn't exist";
        }

        const { secret: accessSecret, authorizedPublicKeys: accessAuthorizedKeys } =
            accessOwnerships[0];

        const foundAuthKey = accessAuthorizedKeys.find(
            (authKey) => {
                return (
                    maybeUint8ArrayToHex(authKey.publicKey).toLocaleUpperCase() ===
                    maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase()
                );
            }
        );
        // the ! means that we know that the key exists because ".find" can return undefined (never undefined in this case)
        const { encryptedSecretKey: accessSecretKey } = foundAuthKey!;

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

        // @ts-ignore
        const { encryptedSecretKey: keychainSecretKey } =
            keychainAuthorizedKeys.find(
                ({ publicKey }) =>
                    maybeUint8ArrayToHex(publicKey).toLocaleUpperCase() === maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase()
            );

        // Decrypt the keychain
        const keychainAESKey = ecDecrypt(keychainSecretKey, accessPrivateKey);
        const encodedKeychain = aesDecrypt(keychainSecret, keychainAESKey);

        let keychain = Keychain.decode(encodedKeychain);

        keychainAuthorizedKeys.forEach(({ publicKey }) => {
            keychain.addAuthorizedPublicKey(publicKey);
        });

        return keychain;
    }
};

export { Keychain }