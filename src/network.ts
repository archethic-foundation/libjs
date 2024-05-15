import * as API from "./api.js";
import Archethic from "./index.js";
import { Balance, OracleData, Token } from "./types.js";
import { AddOriginKeyResponse } from "./api/types.js";

export default class Network {
  private readonly core: Archethic;
  /** @hidden */
  constructor(core: Archethic) {
    this.core = core;
  }

  /**
   * Fetch the public key of the shared storage node key
   * @returns {Promise<string>} The public key of the storage nonce
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
   * ```
   */
  async getStorageNoncePublicKey(): Promise<string> {
    return this.core.requestNode((endpoint) => API.getStorageNoncePublicKey(endpoint));
  }

  /**
   * Query a node to add a new origin public to be authorized to sign transaction with the corresponding private key (see OriginSign)
   * @param {string} originKey The public key to add
   * @param {string} certificate The certificate that prove the public key is allowed to be added
   * @returns {Promise<AddOriginKeyResponse>} The transaction response
   */
  async addOriginKey(originKey: string, certificate: string): Promise<AddOriginKeyResponse> {
    return this.core.rpcNode!.addOriginKey({
      certificate,
      origin_public_key: originKey
    });
  }

  /**
   * Call a Smart Contract's exported function with given args
   * @param {string} contractAddress The contract address (usually latest or genesis)
   * @param {string} functionName The exported function to call
   * @param {any[]} args The list of arguments to call the function with
   * @returns {Promise<any>} The function response
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const response = await archethic.network.callFunction("0000AB...CD", "add", [1, 2]);
   * ```
   */
  async callFunction(contractAddress: string, functionName: string, args: any[]): Promise<any> {
    return this.core.rpcNode!.callFunction(contractAddress, functionName, args);
  }

  /**
   * Fetch the OracleChain data
   * @param {number} timestamp The timestamp to fetch the data from
   * @returns {Promise<OracleData>} The OracleChain data
   * @example Fetch the OracleChain data
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net")
   * await archethic.connect()
   * const oracleData = await archethic.network.getOracleData()
   * ```
   * @example Fetch the OracleChain data at a specific timestamp
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net")
   * await archethic.connect()
   * const timestamp = Date.now();
   * const oracleData = await archethic.network.getOracleData(timestamp)
   * ```
   */
  async getOracleData(timestamp: number | undefined = undefined): Promise<OracleData> {
    return this.core.requestNode((endpoint) => API.getOracleData(endpoint, timestamp));
  }

  /**
   * Subscribe to get the real time updates of the OracleChain
   * @param {Function} callback The callback function to call when an update is received
   * @returns {Promise<any>} The subscription response
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net")
   * await archethic.connect()
   * await archethic.network.subscribeToOracleUpdates(console.log)
   * ```
   */
  async subscribeToOracleUpdates(callback: Function): Promise<any> {
    return this.core.requestNode((endpoint) => API.subscribeToOracleUpdates(endpoint, callback));
  }

  /**
   * Query a node to get the token definition (based on AEIP2) from an address
   * @param {string} tokenAddress The token address
   * @returns {Promise<Token>} The token information also genesis address and id
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const token = await archethic.network.getToken("0000AB...CD");
   * ```
   */
  async getToken(tokenAddress: string): Promise<Token | {}> {
    return this.core.requestNode((endpoint) => API.getToken(tokenAddress, endpoint));
  }

  /**
   * Query a node to fetch the last balance of the given address
   * @param {string} address The address to get the balance of
   * @returns {Promise<Balance>} The balance of the address
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk"
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect()
   * const balance = await archethic.network.getBalance("0000AB...CD");
   * ```
   * */
  async getBalance(address: string): Promise<Balance> {
    return this.core.requestNode((endpoint) => API.getBalance(address, endpoint));
  }

  /**
   * Query the GraphQL API of the node with a custom graphQL query that fits your needs
   * @param {string} query The graphQL query
   * @returns {Promise<any>} The response of the query
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   * const query = `
   * query {
   *   transactions(page:1) {
   *     address
   *     chainLength
   *     data {
   *       code
   *     }
   *     type
   *     version
   *   }
   * }
   * `;
   * const response = await archethic.network.rawGraphQLQuery(query);
   * ```
   * */
  async rawGraphQLQuery(query: string): Promise<any> {
    return this.core.requestNode((endpoint) => API.rawGraphQLQuery(query, endpoint));
  }
}
