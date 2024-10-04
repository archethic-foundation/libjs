import {
  AuthorizedKey,
  AuthorizedKeyUserInput,
  Curve,
  HashAlgorithm,
  TransactionData,
  UserTypeTransaction,
  TransactionRPC,
  Contract
} from "./types.js";
import {
  concatUint8Arrays,
  intToUint8Array,
  intToUint32Array,
  intToUint64Array,
  maybeHexToUint8Array,
  maybeStringToUint8Array,
  uint8ArrayToHex
} from "./utils.js";
import TE from "./typed_encoding.js";
import { deriveAddress, deriveKeyPair, sign } from "./crypto.js";

export const VERSION = 4;

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
   */
  constructor(type: UserTypeTransaction | string = UserTypeTransaction.transfer) {
    this.version = VERSION;
    this.type = type as UserTypeTransaction;
    this.address = new Uint8Array();
    this.data = {
      ownerships: [],
      content: "",
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
   * @param {String} type Transaction type
   */
  setType(type: UserTypeTransaction | string) {
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
   * Add smart contract's definition to the transcation
   * @param {Contract} code Smart contract code
   */
  setContract(contract: Contract) {
    this.data.contract = contract;
    return this;
  }

  /**
   * Add a content to the transaction
   * @param {String} content Hosted content
   */
  setContent(content: string) {
    this.data.content = content;
    return this;
  }

  /**
   * Add an ownership with a secret and its authorized public keys
   * @param {string | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
   * @param {AuthorizedKeyUserInput[]} authorizedKeys List of authorized keys
   */
  addOwnership(secret: string | Uint8Array, authorizedKeys: AuthorizedKeyUserInput[]) {
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
   * @param {bigint} amount Amount of UCO to transfer
   */
  addUCOTransfer(to: string | Uint8Array, amount: bigint) {
    to = maybeHexToUint8Array(to);

    if (amount <= 0) {
      throw new Error("UCO transfer amount must be a positive number");
    }

    this.data.ledger.uco.transfers.push({ to, amount });
    return this;
  }

  /**
   * Add a token transfer to the transaction
   * @param {string | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
   * @param {BigInt} amount Amount of UCO to transfer
   * @param {string | Uint8Array} tokenAddress Address of token to spend (hexadecimal or binary buffer)
   * @param {number} tokenId ID of the token to use (default to 0)
   */
  addTokenTransfer(to: string | Uint8Array, amount: bigint, tokenAddress: string | Uint8Array, tokenId: number = 0) {
    to = maybeHexToUint8Array(to);
    tokenAddress = maybeHexToUint8Array(tokenAddress);

    if (amount <= 0) {
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
   * @param {any[] | object} args The arguments for the named action
   */
  addRecipient(to: string | Uint8Array, action?: string, args?: any[] | object) {
    const address = maybeHexToUint8Array(to);

    if (action && typeof action != "string") {
      throw new Error("`action` must be a string");
    }

    if (args && typeof(args) !== "object") {
      throw new Error("`args` must be an object or an array");
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
   */
  setPreviousSignatureAndPreviousPublicKey(prevSign: string | Uint8Array, prevPubKey: string | Uint8Array) {
    prevSign = maybeHexToUint8Array(prevSign);
    prevPubKey = maybeHexToUint8Array(prevPubKey);

    this.previousPublicKey = prevPubKey;
    this.previousSignature = prevSign;
    return this;
  }

  /**
   * Set the transaction builder with address (required for originSign)
   * @param {string | Uint8Array} addr Address (hexadecimal | Uint8Array)
   *
   */
  setAddress(addr: string | Uint8Array) {
    addr = maybeHexToUint8Array(addr);

    this.address = addr;
    return this;
  }

  /**
   * Add a encrypted (by storage nonce public key) seed in the transaction's ownerships to allow nodes to manage smart contract
   * @param {boolean} generateEncryptedSeedSC Generate encrypted seed for smart contract
   */
  setGenerateEncryptedSeedSC(generateEncryptedSeedSC: boolean) {
    this.generateEncryptedSeedSC = generateEncryptedSeedSC;
    return this;
  }

  /**
   * Generate the transaction address, keys and signatures
   * @param {string | Uint8Array} seed Transaction chain seed (hexadecimal or binary buffer)
   * @param {number} index Number of transaction on the chain
   * @param {string} curve Elliptic curve to use for the key generation
   * @param {string} hashAlgo Hash algorithm to use for the address generation
   */
  build(seed: string | Uint8Array, index: number = 0, curve: string = "ed25519", hashAlgo: string = "sha256") {
    if (seed == undefined || seed == null) {
      throw new Error("Seed must be defined");
    }

    if (index == undefined || index == null) {
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
   */
  originSign(privateKey: string | Uint8Array) {
    privateKey = maybeHexToUint8Array(privateKey);

    this.originSignature = sign(this.originSignaturePayload(), privateKey);
    return this;
  }

  /**
   * Set the Txn's originSignature, method called from hardware_libs
   * @param {string | Uint8Array} signature Origin Signature (hexadecimal or binary)
   */
  setOriginSign(signature: string | Uint8Array) {
    signature = maybeHexToUint8Array(signature);

    this.originSignature = signature;
    return this;
  }

  originSignaturePayload() {
    const payloadForPreviousSignature = this.previousSignaturePayload();
    return concatUint8Arrays(
      payloadForPreviousSignature,
      this.previousPublicKey,
      Uint8Array.from([this.previousSignature.length]),
      this.previousSignature
    );
  }

  /**
   * Generate the payload for the previous signature by encoding address,  type and data
   */
  previousSignaturePayload() {
    let bufContract: Uint8Array = intToUint32Array(0)
    if (this.data.contract != undefined) {
      const contract = this.data.contract
      const manifestJSON = JSON.stringify(contract.manifest)
      bufContract = concatUint8Arrays(
        intToUint32Array(contract.bytecode.byteLength),
        contract.bytecode,
        intToUint32Array(manifestJSON.length),
        new TextEncoder().encode(manifestJSON)
      )
    }

    let contentSize = this.data.content.length;

    const bufContentSize = intToUint32Array(contentSize);

    const ownershipsBuffer = this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
      const bufAuthKeyLength = intToUint8Array(authorizedPublicKeys.length);
      const authorizedKeysBuffer = [Uint8Array.from([bufAuthKeyLength.length]), bufAuthKeyLength];

      // Sort authorized public key by alphabethic order
      authorizedPublicKeys.sort((a, b) => uint8ArrayToHex(a.publicKey).localeCompare(uint8ArrayToHex(b.publicKey)));

      authorizedPublicKeys.forEach(({ publicKey, encryptedSecretKey }) => {
        authorizedKeysBuffer.push(maybeHexToUint8Array(publicKey));
        authorizedKeysBuffer.push(maybeHexToUint8Array(encryptedSecretKey));
      });

      return concatUint8Arrays(intToUint32Array(secret.byteLength), secret, concatUint8Arrays(...authorizedKeysBuffer));
    });

    const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
      return concatUint8Arrays(transfer.to, intToUint64Array(transfer.amount));
    });

    const tokenTransfersBuffers = this.data.ledger.token.transfers.map(function (transfer) {
      const bufTokenId = intToUint8Array(transfer.tokenId);
      return concatUint8Arrays(
        transfer.tokenAddress,
        transfer.to,
        intToUint64Array(transfer.amount),
        Uint8Array.from([bufTokenId.length]),
        bufTokenId
      );
    });

    const recipientsBuffer = this.data.recipients.map(({ address, action, args }) => {
      if (action == undefined || args == undefined) {
        return concatUint8Arrays(
          // 0 = unnamed action
          Uint8Array.from([0]),
          // address
          address
        );
      } else {
        const serializedArgs = args instanceof Array ? args.map((arg) => TE.serialize(arg)) : [TE.serialize(args)];

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

    const bufOwnershipLength = intToUint8Array(this.data.ownerships.length);
    const bufUCOTransferLength = intToUint8Array(this.data.ledger.uco.transfers.length);
    const bufTokenTransferLength = intToUint8Array(this.data.ledger.token.transfers.length);
    const bufRecipientLength = intToUint8Array(this.data.recipients.length);

    return concatUint8Arrays(
      intToUint32Array(VERSION),
      this.address,
      Uint8Array.from([getTransactionTypeId(this.type)]),
      bufContract,
      bufContentSize,
      new TextEncoder().encode(this.data.content),
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
   * JSON RPC API SEND_TRANSACTION
   */
  async toNodeRPC(): Promise<TransactionRPC> {
    return {
      version: this.version,
      address: uint8ArrayToHex(this.address),
      type: this.type,
      data: {
        content: this.data.content,
        contract: this.data.contract ? {
          bytecode: uint8ArrayToHex(this.data.contract?.bytecode),
          manifest: this.data.contract?.manifest
        } : undefined, 
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
   * Wallet RPC API
   * content is normal
   * only transaction payload (no address/public key/signatures)
   */
  toWalletRPC(): object {
    return {
      version: this.version,
      type: this.type,
      data: {
        content: this.data.content,
        contract: this.data.contract,
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
