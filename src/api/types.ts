import { TransactionFee, TransactionRPC } from '../types'

export type NodeRpcMethods = {
    contract_fun(params: {
        contract: string,
        function: string,
        args?: any[]
    }): any,
    estimate_transaction_fee(params: TransactionRPC): TransactionFee,
    send_transaction(params: TransactionRPC): TransactionRpcResponse,
    simulate_contract_execution(params: TransactionRPC): ContractSimulationResponse,
    add_origin_key(params: AddOriginKeyRpc): TransactionRpcResponse
}

export type AddOriginKeyRpc = {
    certificate: string,
    origin_public_key: string,
}

export type TransactionRpcResponse = {
    transaction_address: string,
    status: string
}

export type ContractSimulationResponse = {
    recipient_address: string,
    valid: boolean,
    error?: string
}


export enum ConnectionState {
    Closed = 'WalletRPCConnection_closed',
    Closing = 'WalletRPCConnection_closing',
    Connecting = 'WalletRPCConnection_connecting',
    Open = 'WalletRPCConnection_open',
}
export enum RpcErrorCode {
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
    Other = 5000,
}

export type RpcSubscription = {
    id: string;
    eventListener: EventListenerOrEventListenerObject;
}

export type RpcNotification = {
    subscriptionId: string;
    data: Object;
}

export type RpcRequestOrigin = {
    name: string;
    url?: string;
    logo?: string;
}

export type RpcRequest = {
    origin: RpcRequestOrigin;
    version: number;
    payload: Object;
}

export type Endpoint = {
    endpointUrl: string;
}

export type AccountIdentity = {
    name: string;
    genesisAddress: string;
}

export type TransactionSuccess = {
    transactionAddress: string,
    nbConfirmations: number,
    maxConfirmations: number,
}

export type SignedTransaction = {
    "address": string,
    "previousPublicKey": string,
    "previousSignature": string,
    "originSignature": string
}
