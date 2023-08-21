import fetch from "cross-fetch";
import { JSONRPCClient, TypedJSONRPCClient } from "json-rpc-2.0";
import { AddOriginKeyRpc, NodeRpcMethods, TransactionRpcResponse, ContractSimulationResponse } from "./types";
import Archethic from "..";
import TransactionBuilder from "../transaction_builder";
import { TransactionFee } from "../types";


export class NodeRPCClient {
  private client: TypedJSONRPCClient<NodeRpcMethods>;
  private core: Archethic;
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
  async callFunction(contractAddress: string, functionName: string, args: any[]) {
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
    return this.client.request("estimate_transaction_fee", tx.toNodeRPC());

  }

  /**
   * Send a transaction
   * @param tx The transaction to send
   * @returns {Promise<TransactionRpcResponse>} The transaction response
   */
  async sendTransaction(tx: TransactionBuilder): Promise<TransactionRpcResponse> {
    return this.client.request("send_transaction", tx.toNodeRPC());
  }

  /**
  * Add an origin key
  * @param {AddOriginKeyRpc} origin
  * @returns {Promise<TransactionRpcResponse>} The transaction response
  */
  async addOriginKey(origin: AddOriginKeyRpc): Promise<TransactionRpcResponse> {
    return this.client.request("add_origin_key", origin);
  }

  /**
   * Simulate contract execution
   * @param tx The contract transaction to simulate
   * @returns {Promise<ContractSimulationResponse>} The simulation response
   */
  async simulateContractExecution(tx: TransactionBuilder): Promise<ContractSimulationResponse> {
    return this.client.request("simulate_contract_execution", tx.toNodeRPC());
  }

  async handleRequest(jsonRPCRequest: any): Promise<any> {
    return this.core.requestNode(async (endpoint) => {
      const url = new URL("/api/rpc", endpoint);

      return fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(jsonRPCRequest),
      }).then((response) => {
        if (response.status === 200) {
          return response
            .json()
            .then((jsonRPCResponse) => this.client.receive(jsonRPCResponse));
        } else if (jsonRPCRequest.id !== undefined) {
          return Promise.reject(new Error(response.statusText));
        }
      })
    })
  }
}
