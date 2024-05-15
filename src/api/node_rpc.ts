import fetch from "cross-fetch";
import { JSONRPCClient, TypedJSONRPCClient } from "json-rpc-2.0";
import {
  AddOriginKeyRequest,
  AddOriginKeyResponse,
  NodeRpcMethods,
  SendTransactionResponse,
  SimulateContractExecutionResponse
} from "./types";
import Archethic from "..";
import TransactionBuilder from "../transaction_builder";
import { TransactionFee } from "../types";

export class NodeRPCClient {
  private readonly client: TypedJSONRPCClient<NodeRpcMethods>;
  private readonly core: Archethic;
  constructor(archethic: Archethic) {
    this.core = archethic;
    this.client = new JSONRPCClient((request) => this.handleRequest(request));
  }

  /**
   *
   * @param {string} contractAddress
   * @param {string} functionName
   * @param {any[]}  args
   * @returns {Promise<void>}
   */
  async callFunction(contractAddress: string, functionName: string, args: any[]): Promise<void> {
    return this.client.request("contract_fun", {
      contract: contractAddress,
      function: functionName,
      args
    });
  }
  /**
   * Get the transaction fee of a transaction
   * @param tx The transaction to get the fee of
   * @returns {Promise<TransactionFee>} The transaction fee
   */
  async getTransactionFee(tx: TransactionBuilder): Promise<TransactionFee> {
    return this.client.request("estimate_transaction_fee", { transaction: tx.toNodeRPC() });
  }

  /**
   * Send a transaction
   * @param tx The transaction to send
   * @returns {Promise<SendTransactionResponse>} The transaction response
   */
  async sendTransaction(tx: TransactionBuilder): Promise<SendTransactionResponse> {
    return this.client.request("send_transaction", { transaction: tx.toNodeRPC() });
  }

  /**
   * Add an origin key
   * @param {AddOriginKeyRequest} origin
   * @returns {Promise<AddOriginKeyResponse>} The transaction response
   */
  async addOriginKey(origin: AddOriginKeyRequest): Promise<AddOriginKeyResponse> {
    return this.client.request("add_origin_key", origin);
  }

  /**
   * Simulate contract execution
   * @param tx The contract transaction to simulate
   * @returns {Promise<SimulateContractExecutionResponse[]>} The simulation response per recipient
   */
  async simulateContractExecution(tx: TransactionBuilder): Promise<SimulateContractExecutionResponse[]> {
    return this.client.request("simulate_contract_execution", { transaction: tx.toNodeRPC() });
  }

  async handleRequest(jsonRPCRequest: any): Promise<any> {
    return this.core.requestNode(async (endpoint) => {
      const url = new URL("/api/rpc", endpoint);

      return fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(jsonRPCRequest)
      }).then((response) => {
        if (response.status === 200) {
          return response.json().then((jsonRPCResponse) => this.client.receive(jsonRPCResponse));
        } else if (jsonRPCRequest.id !== undefined) {
          return Promise.reject(new Error(response.statusText));
        }
      });
    });
  }
}
