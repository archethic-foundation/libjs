export declare enum ConnectionState {
    Closed = "WalletRPCConnection_closed",
    Closing = "WalletRPCConnection_closing",
    Connecting = "WalletRPCConnection_connecting",
    Open = "WalletRPCConnection_open"
}
export declare enum RpcErrorCode {
    UnsupportedMethod = -32601,
    Timeout = 5001,
    Connectivity = 4901,
    ConsensusNotReached = 5002,
    InvalidParams = -32602,
    InvalidTransaction = 5003,
    InvalidConfirmation = 5006,
    InsufficientFunds = 5004,
    ServiceNotFound = 5007,
    UserRejected = 4001,
    UnknownAccount = 5005,
    Other = 5000
}
export type RpcSubscription = {
    id: string;
    eventListener: EventListenerOrEventListenerObject;
};
export type RpcNotification = {
    subscriptionId: string;
    data: Object;
};
export type RpcRequestOrigin = {
    name: string;
    url?: string;
    logo?: string;
};
export type RpcRequest = {
    origin: RpcRequestOrigin;
    version: number;
    payload: Object;
};
export type Endpoint = {
    endpointUrl: string;
};
export type AccountIdentity = {
    name: string;
    genesisAddress: string;
};
export type TransactionSuccess = {
    transactionAddress: string;
    nbConfirmations: number;
    maxConfirmations: number;
};
export type SignedTransaction = {
    "address": string;
    "previousPublicKey": string;
    "previousSignature": string;
    "originSignature": string;
};
