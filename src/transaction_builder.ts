import {
  AuthorizedKey,
  AuthorizedKeyUserInput,
  Curve,
  HashAlgorithm,
  TransactionData,
  UserTypeTransaction,
  TransactionRPC
} from "./types.js";
import {
  bigIntToUint8Array,
  concatUint8Arrays,
  intToUint8Array,
  maybeHexToUint8Array,
  maybeStringToUint8Array,
  toByteArray,
  uint8ArrayToHex
} from "./utils.js";
import TE from "./typed_encoding.js";
import { deriveAddress, deriveKeyPair, sign } from "./crypto.js";

const VERSION = 3;

function getTransactionTypeId(type: UserTypeTransaction): number {
  switch (type) {
    case UserTypeTransaction.keychain:
      return 255;
    case UserTypeTransaction.keychain_access:
      return 254;
    case UserTypeTransaction.transfer:
      return 253;
    case UserTypeTransaction.hosting:
      return 252;
    case UserTypeTransaction.token:
      return 251;
    case UserTypeTransaction.data:
      return 250;
    case UserTypeTransaction.contract:
      return 249;
    case UserTypeTransaction.code_proposal:
      return 5;
    case UserTypeTransaction.code_approval:
      return 6;
    default:
      return 0;
  }
}

export default class TransactionBuilder {
  public version: number;
  public type: UserTypeTransaction;
  public address: Uint8Array;
  public data: TransactionData;
  public previousPublicKey: Uint8Array;
  public previousSignature: Uint8Array;
  public originSignature: Uint8Array;
  public generateEncryptedSeedSC: boolean;

  /**
   * Create a new instance of the transaction builder
   * @param {UserTypeTransaction | string} type Transaction {@link UserTypeTransaction | type} is the string defining the type of transaction to generate
   */
  constructor(type: UserTypeTransaction | string = UserTypeTransaction.transfer) {
    this.version = VERSION;
    this.type = type as UserTypeTransaction;
    this.address = new Uint8Array();
    this.data = {
      content: new Uint8Array(),
      code: new Uint8Array(),
      ownerships: [],
      ledger: {
        uco: {
          transfers: []
        },
        token: {
          transfers: []
        }
      },
      recipients: []
    };
    this.previousPublicKey = new Uint8Array();
    this.previousSignature = new Uint8Array();
    this.originSignature = new Uint8Array();
    this.generateEncryptedSeedSC = false;
  }

  /**
   * Set the type of the transaction
   * @param {UserTypeTransaction | string} type Transaction {@link UserTypeTransaction | type} is the string defining the type of transaction to generate
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the transaction type is not valid
   */
  setType(type: UserTypeTransaction | string): this {
    if (!Object.keys(UserTypeTransaction).includes(type)) {
      throw new Error(
        "Transaction type must be one of " +
          Object.keys(UserTypeTransaction)
            .map((t) => `'${t}'`)
            .join(", ")
      );
    }
    this.type = type as UserTypeTransaction;
    return this;
  }

  /**
   * Add smart contract code to the transcation
   * @param {string} code Smart contract code is a string defining the smart contract
   * @returns {TransactionBuilder} The transaction builder instance
   */
  setCode(code: string): this {
    this.data.code = new TextEncoder().encode(code);
    return this;
  }

  /**
   * Add a content to the transaction
   * @param {string | Uint8Array} content Hosted content
   * @returns {TransactionBuilder} The transaction builder instance
   */
  setContent(content: string | Uint8Array): this {
    if (typeof content == "string") {
      content = new TextEncoder().encode(content);
    }
    this.data.content = content;
    return this;
  }

  /**
   * Add an ownership in the data.ownerships section of the transaction with a secret and its related authorized public keys to be able to decrypt it.
   *
   * This aims to prove the ownership or the delegatation of some secret to a given list of public keys.
   * @param {string | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
   * @param {AuthorizedKeyUserInput[]} authorizedKeys List of authorized keys to decrypt the secret (publicKey and encryptedSecretKey)
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the authorized keys are not an array
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * import Crypto from "@archethicjs/crypto";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const seed = "myseed";
   * const genesisAddress = Crypto.deriveAddress(seed, 0);
   * const index = await archethic.transaction.getTransactionIndex(genesisAddress);
   * const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
   * const { encryptedSecret, authorizedKeys } = Crypto.encryptSecret(Crypto.randomSecretKey(), storageNoncePublicKey);
   * const tx = archethic.transaction.new()
   *   .setType("contract")
   *   .setCode("...")
   *   .addOwnership(encryptedSecret, authorizedKeys)
   *   .build(seed, index)
   *   .originSign(Utils.originPrivateKey)
   *   .send();
   * ```
   */
  addOwnership(secret: string | Uint8Array, authorizedKeys: AuthorizedKeyUserInput[]): this {
    secret = maybeStringToUint8Array(secret);

    if (!Array.isArray(authorizedKeys)) {
      throw new Error("Authorized keys must be an array");
    }

    const filteredAuthorizedKeys: AuthorizedKey[] = [];

    // remove duplicate keys
    const acc = new Map();
    authorizedKeys.forEach(({ publicKey, encryptedSecretKey }) => {
      if (acc.has(publicKey)) return;

      filteredAuthorizedKeys.push({
        publicKey: maybeHexToUint8Array(publicKey),
        encryptedSecretKey: maybeHexToUint8Array(encryptedSecretKey)
      });

      acc.set(publicKey, encryptedSecretKey);
    });

    this.data.ownerships.push({
      secret: secret,
      authorizedPublicKeys: filteredAuthorizedKeys
    });

    return this;
  }

  /**
   * Add a UCO transfer to the transaction
   * @param {string | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
   * @param {number} amount Amount of UCO to transfer (in bigint)
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the amount is not a positive number
   */
  addUCOTransfer(to: string | Uint8Array, amount: number): this {
    to = maybeHexToUint8Array(to);

    if (isNaN(amount) || amount <= 0) {
      throw new Error("UCO transfer amount must be a positive number");
    }

    this.data.ledger.uco.transfers.push({ to, amount });
    return this;
  }

  /**
   * Add a token transfer to the transaction
   * @param {string | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
   * @param {number} amount Amount of UCO to transfer (in bigint)
   * @param {string | Uint8Array} tokenAddress Address of token to spend (hexadecimal or binary buffer)
   * @param {number} tokenId ID of the token to use (default to 0)
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the amount is not a positive number
   * @throws {Error} If the tokenId is not a valid integer
   */
  addTokenTransfer(
    to: string | Uint8Array,
    amount: number,
    tokenAddress: string | Uint8Array,
    tokenId: number = 0
  ): this {
    to = maybeHexToUint8Array(to);
    tokenAddress = maybeHexToUint8Array(tokenAddress);

    if (isNaN(amount) || amount <= 0) {
      throw new Error("Token transfer amount must be a positive number");
    }

    if (isNaN(tokenId) || tokenId < 0) {
      throw new Error("'tokenId' must be a valid integer >= 0");
    }

    this.data.ledger.token.transfers.push({
      to: to,
      amount: amount,
      tokenAddress: tokenAddress,
      tokenId: tokenId
    });
    return this;
  }

  /**
   * Add recipient to the transaction
   * @param {string | Uint8Array} to Recipient address (hexadecimal or binary buffer)
   * @param {string} action The named action
   * @param {any[]} args The arguments list for the named action (can only contain JSON valid data)
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the action is not a string
   * @throws {Error} If the args is not an array
   * @example Smart contract example
   * ```
   * @ version 1
   * condition triggered_by: transaction, on: vote(candidate), as: [
   *     content: (
   *       # check incoming vote
   *       valid_candidate? = List.in?(["Miss Scarlett", "Colonel Mustard"], candidate)
   *
   *       # check incoming voter
   *       valid_voter? = !List.in?(
   *         State.get("voters_genesis_addresses", []),
   *         Chain.get_genesis_address(transaction.address)
   *       )
   *
   *       valid_candidate? && valid_voter?
   *     )
   * ]
   *
   * actions triggered_by: transaction, on: vote(candidate) do
   *     scarlett_votes = State.get("Miss Scarlett", 0)
   *     mustard_votes = State.get("Colonel Mustard", 0)
   *     voters = State.get("voters_genesis_addresses", [])
   *
   *     if candidate == "Miss Scarlett" do
   *       scarlett_votes = scarlett_votes + 1
   *     end
   *     if candidate == "Colonel Mustard" do
   *       mustard_votes = mustard_votes + 1
   *     end
   *
   *     # Add the current voter genesis address to the list
   *     # So he/she cannot vote twice
   *     voters = List.prepend(voters, Chain.get_genesis_address(transaction.address))
   *
   *     State.set("Miss Scarlett", scarlett_votes)
   *     State.set("Colonel Mustard", mustard_votes)
   *     State.set("voters_genesis_addresses", voters)
   * end
   *
   * export fun get_votes() do
   *   [
   *     scarlett: State.get("Miss Scarlett", 0),
   *     mustard: State.get("Colonel Mustard", 0)
   *   ]
   * end
   * ```
   * @example Usage example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const seed = "myseed";
   * const genesisAddress = Crypto.deriveAddress(seed, 0);
   * const index = await archethic.transaction.getTransactionIndex(genesisAddress);
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addRecipient("0000bc96b1a9751d3750edb9381a55b5b4e4fb104c10b0b6c9a00433ec464637bfab", "vote", ["Miss Scarlett"])
   *   .build(seed, index)
   *   .originSign(Utils.originPrivateKey)
   *   .send();
   * ```
   */
  addRecipient(to: string | Uint8Array, action?: string, args?: any[]): this {
    const address = maybeHexToUint8Array(to);

    if (action && typeof action != "string") {
      throw new Error("`action` must be a string");
    }

    if (args && !Array.isArray(args)) {
      throw new Error("`args` must be an array");
    }

    if (action && !args) {
      args = [];
    }

    this.data.recipients.push({ address, action, args });
    return this;
  }

  /**
   * Set the transaction builder with Previous Publickey and Previous Signature
   * @param {string | Uint8Array} prevSign Previous Signature (hexadecimal)
   * @param {string | Uint8Array} prevPubKey Previous PublicKey (hexadecimal)
   * @returns {TransactionBuilder} The transaction builder instance
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);
   *
   * const signaturePayload = tx.previousSignaturePayload();
   * const prevSign = someFunctionToGetSignature(signaturePayload);
   * const prevPubKey = someFunctionToGetPubKey();
   * tx.setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey);
   * ```
   */
  setPreviousSignatureAndPreviousPublicKey(prevSign: string | Uint8Array, prevPubKey: string | Uint8Array): this {
    prevSign = maybeHexToUint8Array(prevSign);
    prevPubKey = maybeHexToUint8Array(prevPubKey);

    this.previousPublicKey = prevPubKey;
    this.previousSignature = prevSign;
    return this;
  }

  /**
   * Set the transaction builder with address (required for originSign)
   * @param {string | Uint8Array} addr Address (hexadecimal | Uint8Array)
   * @returns {TransactionBuilder} The transaction builder instance
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);
   *
   * const txAddress = someFunctionToGetTxAddress();
   * tx.setAddress(txAddress);
   * ```
   */
  setAddress(addr: string | Uint8Array): this {
    addr = maybeHexToUint8Array(addr);

    this.address = addr;
    return this;
  }

  /**
   * Add a encrypted (by storage nonce public key) seed in the transaction's ownerships to allow nodes to manage smart contract
   * @param {boolean} generateEncryptedSeedSC Generate encrypted seed for smart contract
   * @returns {TransactionBuilder} The transaction builder instance
   */
  setGenerateEncryptedSeedSC(generateEncryptedSeedSC: boolean): this {
    this.generateEncryptedSeedSC = generateEncryptedSeedSC;
    return this;
  }

  /**
   * Generate the transaction address, keys and signatures
   * @param {string | Uint8Array} seed Transaction chain seed (hexadecimal or binary buffer)
   * @param {number} index Number of transaction on the chain
   * @param {string} curve Elliptic curve to use for the key generation
   * @param {string} hashAlgo Hash algorithm to use for the address generation
   * @returns {TransactionBuilder} The transaction builder instance
   * @throws {Error} If the seed is not defined
   * @throws {Error} If the index is not defined
   * @throws {Error} If the curve is not valid
   * @throws {Error} If the hash algorithm is not valid
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
   *   .build("mysuperpassphraseorseed", 0);
   * ```
   */
  build(seed: string | Uint8Array, index: number = 0, curve: string = "ed25519", hashAlgo: string = "sha256"): this {
    if (seed === undefined || seed === null) {
      throw new Error("Seed must be defined");
    }

    if (index === undefined || index === null) {
      throw new Error("Index must be defined");
    }

    if (!Object.keys(Curve).includes(curve)) {
      throw new Error(
        "Curve must be one of " +
          Object.keys(Curve)
            .map((t) => `'${t}'`)
            .join(", ")
      );
    }
    if (!Object.keys(HashAlgorithm).includes(hashAlgo)) {
      throw new Error(
        "Hash algorithm must be one of " +
          Object.keys(HashAlgorithm)
            .map((t) => `'${t}'`)
            .join(", ")
      );
    }

    const keypair = deriveKeyPair(seed, index, curve as Curve);
    this.address = deriveAddress(seed, index + 1, curve as Curve, hashAlgo as HashAlgorithm);
    this.previousPublicKey = keypair.publicKey;

    const payloadForPreviousSignature = this.previousSignaturePayload();

    this.previousSignature = sign(payloadForPreviousSignature, keypair.privateKey);

    return this;
  }

  /**
   * Sign the transaction with an origin private key
   * @param {string | Uint8Array} privateKey Origin Private Key (hexadecimal or binary buffer)
   * @returns {TransactionBuilder} The transaction builder instance
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer(
   *     "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
   *     0.42
   *   )
   *   .build("myseed", 0);
   *   .originSign(Utils.originPrivateKey)
   * ```
   */
  originSign(privateKey: string | Uint8Array): this {
    privateKey = maybeHexToUint8Array(privateKey);

    this.originSignature = sign(this.originSignaturePayload(), privateKey);
    return this;
  }

  /**
   * Set the Txn's originSignature, method called from hardware_libs
   * @param {string | Uint8Array} signature Origin Signature (hexadecimal or binary)
   * @returns {TransactionBuilder} The transaction builder instance
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
   *   .build("mysuperpassphraseorseed", 0);
   *
   * const originPayload = tx.originSignaturePayload();
   * const originSignature = someFunctionToGetSignature(originPayload);
   * tx.setOriginSign(originSignature);
   * ```
   */
  setOriginSign(signature: string | Uint8Array): this {
    signature = maybeHexToUint8Array(signature);

    this.originSignature = signature;
    return this;
  }

  /**
   * Get an Uint8Array payload to be signed with the origin private key of the device
   * @returns {Uint8Array} The payload for the origin signature
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
   *   .build(seed, originPrivateKey);
   *
   * const originPayload = tx.originSignaturePayload();
   * ```
   */
  originSignaturePayload(): Uint8Array {
    const payloadForPreviousSignature = this.previousSignaturePayload();
    return concatUint8Arrays(
      payloadForPreviousSignature,
      this.previousPublicKey,
      Uint8Array.from([this.previousSignature.length]),
      this.previousSignature
    );
  }

  /**
   * Generate the payload for the previous signature by encoding address, type and data
   * @returns {Uint8Array} The payload for the previous signature
   * @example
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);
   *
   * const signaturePayload = tx.previousSignaturePayload();
   */
  previousSignaturePayload(): Uint8Array {
    const bufCodeSize = intToUint8Array(this.data.code.length);

    const contentSize = this.data.content.length;

    const bufContentSize = intToUint8Array(contentSize);

    const ownershipsBuffer = this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
      const bufAuthKeyLength = toByteArray(authorizedPublicKeys.length);
      const authorizedKeysBuffer = [Uint8Array.from([bufAuthKeyLength.length]), bufAuthKeyLength];

      // Sort authorized public key by alphabethic order
      authorizedPublicKeys.sort((a, b) => uint8ArrayToHex(a.publicKey).localeCompare(uint8ArrayToHex(b.publicKey)));

      authorizedPublicKeys.forEach(({ publicKey, encryptedSecretKey }) => {
        authorizedKeysBuffer.push(maybeHexToUint8Array(publicKey));
        authorizedKeysBuffer.push(maybeHexToUint8Array(encryptedSecretKey));
      });

      return concatUint8Arrays(intToUint8Array(secret.byteLength), secret, concatUint8Arrays(...authorizedKeysBuffer));
    });

    const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
      return concatUint8Arrays(transfer.to, bigIntToUint8Array(transfer.amount));
    });

    const tokenTransfersBuffers = this.data.ledger.token.transfers.map(function (transfer) {
      const bufTokenId = toByteArray(transfer.tokenId);
      return concatUint8Arrays(
        transfer.tokenAddress,
        transfer.to,
        bigIntToUint8Array(transfer.amount),
        Uint8Array.from([bufTokenId.length]),
        bufTokenId
      );
    });

    const recipientsBuffer = this.data.recipients.map(({ address, action, args }) => {
      if (action === undefined || args === undefined) {
        return concatUint8Arrays(
          // 0 = unnamed action
          Uint8Array.from([0]),
          // address
          address
        );
      } else {
        const serializedArgs = args.map((arg) => TE.serialize(arg));

        return concatUint8Arrays(
          // 1 = named action
          Uint8Array.from([1]),
          // address
          address,
          // action
          Uint8Array.from([action.length]),
          new TextEncoder().encode(action),
          // args count
          Uint8Array.from([serializedArgs.length]),
          // args
          ...serializedArgs
        );
      }
    });

    const bufOwnershipLength = toByteArray(this.data.ownerships.length);
    const bufUCOTransferLength = toByteArray(this.data.ledger.uco.transfers.length);
    const bufTokenTransferLength = toByteArray(this.data.ledger.token.transfers.length);
    const bufRecipientLength = toByteArray(this.data.recipients.length);

    return concatUint8Arrays(
      intToUint8Array(VERSION),
      this.address,
      Uint8Array.from([getTransactionTypeId(this.type)]),
      bufCodeSize,
      this.data.code,
      bufContentSize,
      this.data.content,
      Uint8Array.from([bufOwnershipLength.length]),
      bufOwnershipLength,
      ...ownershipsBuffer,
      Uint8Array.from([bufUCOTransferLength.length]),
      bufUCOTransferLength,
      ...ucoTransfersBuffers,
      Uint8Array.from([bufTokenTransferLength.length]),
      bufTokenTransferLength,
      ...tokenTransfersBuffers,
      Uint8Array.from([bufRecipientLength.length]),
      bufRecipientLength,
      ...recipientsBuffer
    );
  }

  /**
   * Export the transaction generated into a JSON-RPC object
   * @returns {TransactionRPC} The JSON-RPC representation of the transaction
   * @private
   */
  toNodeRPC(): TransactionRPC {
    return {
      version: this.version,
      address: uint8ArrayToHex(this.address),
      type: this.type,
      data: {
        content: new TextDecoder().decode(this.data.content),
        code: new TextDecoder().decode(this.data.code),
        ownerships: this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
          return {
            secret: uint8ArrayToHex(secret),
            // TODO : authorizedPublicKeys or authorizedKeys ?
            authorizedKeys: authorizedPublicKeys.map(({ publicKey, encryptedSecretKey }) => {
              return {
                publicKey: uint8ArrayToHex(publicKey),
                encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
              };
            })
          };
        }),
        ledger: {
          uco: {
            transfers: this.data.ledger.uco.transfers.map((t) => {
              return {
                to: uint8ArrayToHex(t.to),
                amount: t.amount
              };
            })
          },
          token: {
            transfers: this.data.ledger.token.transfers.map((t) => {
              return {
                to: uint8ArrayToHex(t.to),
                amount: t.amount,
                tokenAddress: uint8ArrayToHex(t.tokenAddress),
                tokenId: t.tokenId
              };
            })
          }
        },
        recipients: this.data.recipients.map(({ address, action, args }) => {
          return {
            address: uint8ArrayToHex(address),
            action: action,
            args: args
          };
        })
      },
      previousPublicKey: uint8ArrayToHex(this.previousPublicKey),
      previousSignature: uint8ArrayToHex(this.previousSignature),
      originSignature: this.originSignature && uint8ArrayToHex(this.originSignature)
    };
  }

  /**
   * Export the transaction generated into JSON
   * @returns {string} The JSON representation of the transaction
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   * const archethic = new Archethic("https://testnet.archethic.net");
   *
   * const tx = archethic.transaction
   *   .new()
   *   .setType("transfer")
   *   .addUCOTransfer(
   *     "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
   *     0.42
   *   )
   *   .build("mysuperpassphraseorseed", 0);
   *   .toJSON();
   * ```
   */
  toJSON(): string {
    return JSON.stringify(this.toNodeRPC());
  }

  /**
   * Wallet RPC API
   * content is normal
   * only transaction payload (no address/public key/signatures)
   * @returns {object} The JSON representation of the transaction for the wallet RPC API
   * @private
   */
  toWalletRPC(): object {
    return {
      version: this.version,
      type: this.type,
      data: {
        content: new TextDecoder().decode(this.data.content),
        code: new TextDecoder().decode(this.data.code),
        ownerships: this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
          return {
            secret: uint8ArrayToHex(secret),
            // TODO : authorizedPublicKeys or authorizedKeys ?
            authorizedKeys: authorizedPublicKeys.map(({ publicKey, encryptedSecretKey }) => {
              return {
                publicKey: uint8ArrayToHex(publicKey),
                encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
              };
            })
          };
        }),
        ledger: {
          uco: {
            transfers: this.data.ledger.uco.transfers.map((t) => {
              return {
                to: uint8ArrayToHex(t.to),
                amount: t.amount
              };
            })
          },
          token: {
            transfers: this.data.ledger.token.transfers.map((t) => {
              return {
                to: uint8ArrayToHex(t.to),
                amount: t.amount,
                tokenAddress: uint8ArrayToHex(t.tokenAddress),
                tokenId: t.tokenId
              };
            })
          }
        },
        recipients: this.data.recipients.map(({ address, action, args }) => {
          return {
            address: uint8ArrayToHex(address),
            action: action,
            args: args
          };
        })
      },
      generateEncryptedSeedSC: this.generateEncryptedSeedSC
    };
  }
}
