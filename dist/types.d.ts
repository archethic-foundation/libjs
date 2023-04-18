export declare enum Curve {
    ed25519 = "ed25519",
    P256 = "P256",
    secp256k1 = "secp256k1"
}
export declare enum HashAlgorithm {
    sha256 = "sha256",
    sha512 = "sha512",
    sha3_256 = "sha3-256",
    sha3_512 = "sha3-512",
    blake2b = "blake2b"
}
export declare enum UserTypeTransaction {
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
    signature: string;
};
export type TransactionData = {
    code: Uint8Array;
    content: Uint8Array;
    ledger: Ledger;
    ownerships: Ownership[];
    recipients: Uint8Array[];
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
export type Ownership = {
    authorizedPublicKeys: AuthorizedKey[];
    secret: Uint8Array;
};
export type AuthorizedKey = {
    encryptedSecretKey: Uint8Array;
    publicKey: Uint8Array;
};
export type AuthorizedKeyUserInput = {
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
export type TransactionFee = {
    fee: number;
    rates: {
        eur: number;
        usd: number;
    };
};
export {};
