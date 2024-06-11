import { TransactionFee, TransactionRPC } from "../types";
import { JSONRPCError } from "json-rpc-2.0";

export type NodeRpcMethods = {
  contract_fun(params: { contract: string; function: string; args?: any[] }): any;
  estimate_transaction_fee(params: EstimateTransactionFeeRequest): TransactionFee;
  send_transaction(params: SendTransactionRequest): SendTransactionResponse;
  simulate_contract_execution(params: SimulateContractExecutionRequest): SimulateContractExecutionResponse[];
  add_origin_key(params: AddOriginKeyRequest): AddOriginKeyResponse;
};

export type AddOriginKeyRequest = {
  certificate: string;
  origin_public_key: string;
};

export type AddOriginKeyResponse = {
  transaction_address: string;
  status: string;
};

export type EstimateTransactionFeeRequest = {
  transaction: TransactionRPC;
};

export type SendTransactionRequest = {
  transaction: TransactionRPC;
};

export type SendTransactionResponse = {
  transaction_address: string;
  status: string;
};

export type SimulateContractExecutionRequest = {
  transaction: TransactionRPC;
};

export type SimulateContractExecutionResponse = {
  recipient_address: string;
  valid: boolean;
  error?: string;
};

export enum ConnectionState {
  Closed = "WalletRPCConnection_closed",
  Closing = "WalletRPCConnection_closing",
  Connecting = "WalletRPCConnection_connecting",
  Open = "WalletRPCConnection_open"
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
  ServiceAlreadyExists = 5008
}

export type RpcError = JSONRPCError;

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
  shortName: string;
  serviceName: string;
  genesisAddress: string;
};

export type TransactionSuccess = {
  transactionAddress: string;
  nbConfirmations: number;
  maxConfirmations: number;
};

export type SignedTransaction = {
  address: string;
  previousPublicKey: string;
  previousSignature: string;
  originSignature: string;
};

export type ErrorReason = {
  code: number;
  data: any;
  message: string;
};
