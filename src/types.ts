export enum Curve {
  ed25519 = "ed25519",
  P256 = "P256",
  secp256k1 = "secp256k1"
}

export enum HashAlgorithm {
  sha256 = "sha256",
  sha512 = "sha512",
  sha3_256 = "sha3-256",
  sha3_512 = "sha3-512",
  blake2b = "blake2b"
}

export enum UserTypeTransaction {
  keychain = "keychain",
  keychain_access = "keychain_access",
  transfer = "transfer",
  hosting = "hosting",
  token = "token",
  data = "data",
  contract = "contract",
  code_proposal = "code_proposal",
  code_approval = "code_approval"
}

export enum NetworkTypeTransaction {
  node = "node",
  node_shared_secrets = "node_shared_secrets",
  origin_shared_secrets = "origin_shared_secrets",
  beacon = "beacon",
  beacon_summary = "beacon_summary",
  oracle = "oracle",
  oracle_summary = "oracle_summary",
  code_proposal = "code_proposal",
  code_approval = "code_approval",
  node_rewards = "node_rewards"
}

export type Service = {
  derivationPath: string;
  curve: Curve;
  hashAlgo: HashAlgorithm;
};

export type Services = {
  [key: string]: Service;
};

export type Balance = {
  token: TokenBalance[];
  uco: number;
};

type TokenBalance = {
  address: string;
  amount: number;
  tokenId: number;
};

export type Token = {
  id: number;
  name: string;
  type: string;
  symbol: string;
  supply: number;
  decimals: number;
  properties?: Object[];
  collection?: Object[];
  ownerships?: Ownership[];
};

type CrossValidationStamp = {
  nodePubliKey: string;
  /** Hexadecimal */
  signature: string;
};

export type TransactionData = {
  code: Uint8Array;
  content: Uint8Array;
  ledger: Ledger;
  ownerships: Ownership[];
  recipients: Recipient[];
};

type Ledger = {
  token: TokenLedger;
  uco: UcoLedger;
};

type TokenLedger = {
  transfers: TokenTransfer[];
};

type TokenTransfer = {
  amount: number;
  to: Uint8Array;
  tokenAddress: Uint8Array;
  tokenId: number;
};

type UcoLedger = {
  transfers: UcoTransfer[];
};

type UcoTransfer = {
  amount: number;
  to: Uint8Array;
};

export type Recipient = {
  address: Uint8Array;
  action?: string;
  args?: any[];
};

export type Ownership = {
  authorizedPublicKeys: AuthorizedKey[];
  /** Hexadecimal */
  secret: Uint8Array;
};

export type AuthorizedKey = {
  /** Hexadecimal */
  encryptedSecretKey: Uint8Array;
  publicKey: Uint8Array;
};

export type AuthorizedKeyUserInput = {
  /** Hexadecimal */
  encryptedSecretKey: string;
  publicKey: string;
};

type TransactionInput = {
  amount: number;
  from: string;
  spent: boolean;
  timestamp: number;
  tokenAddress: string;
  tokenId: number;
  type: string;
};

type ValidationStamp = {
  ledgerOperation: LedgerOperation;
  timestamp: number;
};

type LedgerOperation = {
  fee: number;
  unspentOutputs: UnspentOutput[];
};

type UnspentOutput = {
  amount: number;
  from: string;
  timestamp: number;
  tokenAddress: string;
  tokenId: number;
  type: string;
  version: number;
};

export type Transaction = {
  address: string;
  balance: Balance;
  chainLength: number;
  rossValidationStamps: CrossValidationStamp[];
  data: TransactionData;
  inputs: TransactionInput[];
  originSignature: string;
  previousAddress: string;
  previousPublicKey: string;
  previousSignature: string;
  type: string;
  validationStamp: ValidationStamp;
  version: number;
};

export type NearestEndpoint = {
  ip: string;
  port: number;
};

export type OracleData = {
  timestamp?: number;
  services: any;
};

export type Keypair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

type Transfer = {
  to: string;
  amount: number;
};

type TokenTransferRPC = {
  to: string;
  amount: number;
  tokenAddress: string;
  tokenId: number;
};

type OwnershipRPC = {
  secret: string;
  authorizedKeys: {
    publicKey: string;
    encryptedSecretKey: string;
  }[];
};

type RecipientRPC = {
  address: string;
  action?: string;
  args?: any[];
};

export type TransactionRPC = {
  version: number;
  address: string;
  type: UserTypeTransaction;
  data: {
    content: string;
    code: string;
    ownerships: OwnershipRPC[];
    ledger: {
      uco: {
        transfers: Transfer[];
      };
      token: {
        transfers: TokenTransferRPC[];
      };
    };
    recipients: RecipientRPC[];
  };
  previousPublicKey: string;
  previousSignature: string;
  originSignature?: string;
  generateEncryptedSeedSC?: boolean;
};

export type TransactionFee = {
  fee: number;
  rates: {
    eur: number;
    usd: number;
  };
};

export type DIDVerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: object;
  publicKeyMultibase?: string;
};

export type DIDService = {
  id: string;
  type: string;
  serviceEndpoint: string;
};

export type DIDDocument = {
  "@context": string[];
  id: string;
  alsoKnownAs?: string[];
  controller?: string;
  verificationMethod?: DIDVerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: Service[];
};

export type ecEncryptServiceSeed = {
  secret: Uint8Array;
  authorizedPublicKeys: AuthorizedKey[];
};
