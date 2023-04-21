import Keychain from "./keychain.js";
import { aesDecrypt, aesEncrypt, deriveAddress, deriveKeyPair, ecDecrypt, ecEncrypt, randomSecretKey, } from "./crypto.js";
import { maybeUint8ArrayToHex, uint8ArrayToHex } from "./utils.js";
export default class Account {
    core;
    constructor(core) {
        this.core = core;
    }
    newKeychainTransaction(keychain, transactionChainIndex) {
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
    newAccessTransaction(seed, keychainAddress) {
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
    async getKeychain(seed) {
        const { publicKey: accessPublicKey, privateKey: accessPrivateKey } = deriveKeyPair(seed, 0);
        const accessKeychainAddress = deriveAddress(seed, 1);
        const accessOwnerships = await this.core.transaction.getTransactionOwnerships(uint8ArrayToHex(accessKeychainAddress));
        if (accessOwnerships.length == 0) {
            throw "Keychain doesn't exist";
        }
        const { secret: accessSecret, authorizedPublicKeys: accessAuthorizedKeys } = accessOwnerships[0];
        const foundAuthKey = accessAuthorizedKeys.find((authKey) => {
            return (maybeUint8ArrayToHex(authKey.publicKey).toLocaleUpperCase() ===
                maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase());
        });
        const { encryptedSecretKey: accessSecretKey } = foundAuthKey;
        const accessAESKey = ecDecrypt(accessSecretKey, accessPrivateKey);
        const keychainGenesisAddress = aesDecrypt(accessSecret, accessAESKey);
        const keychainOwnerships = await this.core.transaction.getTransactionOwnerships(keychainGenesisAddress, true);
        const { secret: keychainSecret, authorizedPublicKeys: keychainAuthorizedKeys, } = keychainOwnerships[0];
        const { encryptedSecretKey: keychainSecretKey } = keychainAuthorizedKeys.find(({ publicKey }) => maybeUint8ArrayToHex(publicKey).toLocaleUpperCase() === maybeUint8ArrayToHex(accessPublicKey).toLocaleUpperCase());
        const keychainAESKey = ecDecrypt(keychainSecretKey, accessPrivateKey);
        const encodedKeychain = aesDecrypt(keychainSecret, keychainAESKey);
        let keychain = Keychain.decode(encodedKeychain);
        keychainAuthorizedKeys.forEach(({ publicKey }) => {
            keychain.addAuthorizedPublicKey(publicKey);
        });
        return keychain;
    }
}
;
//# sourceMappingURL=account.js.map