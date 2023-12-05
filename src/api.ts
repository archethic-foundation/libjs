import fetch from "cross-fetch";
import absinthe from "./api/absinthe.js";
import { maybeUint8ArrayToHex } from "./utils.js";
import { Balance, NearestEndpoint, OracleData, Ownership, Token } from "./types.js";

/**
 * Send a custom query to the Archethic API
 * @param query
 * @param endpoint
 */
export async function rawGraphQLQuery(query: string, endpoint: string): Promise<any> {
  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: query
    })
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors) {
        return null;
      } else {
        return res.data;
      }
    });
}

/**
 * Get the nearest endpoints from the Archethic API
 * @param endpoint The Archethic API endpoint
 * @returns {Promise<NearestEndpoint[]>} A list of nearest endpoints
 */
export async function getNearestEndpoints(endpoint: string): Promise<NearestEndpoint[]> {
  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    nearestEndpoints {
                        ip,
                        port
                    }
                }`
    })
  })
    .then(handleResponse)
    .then((res): NearestEndpoint[] => {
      if (res.errors || res.data.nearestEndpoints == null) {
        return [];
      } else {
        return res.data.nearestEndpoints;
      }
    });
}

/**
 * Get the transaction index of an address
 * @param address address to get the transaction index
 * @param endpoint The Archethic API endpoint
 */
export async function getTransactionIndex(address: string | Uint8Array, endpoint: string): Promise<number> {
  address = maybeUint8ArrayToHex(address);

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    lastTransaction(address: "${address}") {
                        chainLength
                    }
                }`
    })
  })
    .then(handleResponse)
    .then((res): number => {
      if (res.errors || res.data.lastTransaction == null) {
        return 0;
      } else {
        return res.data.lastTransaction.chainLength;
      }
    });
}

/**
 * Get the balance of an address
 * @param endpoint The Archethic API endpoint
 * @returns {Promise<string>} The balance of the address
 */
export async function getStorageNoncePublicKey(endpoint: string): Promise<string> {
  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`
    })
  })
    .then(handleResponse)
    .then((res): string => {
      if (res.errors || res.data.sharedSecrets == null) {
        return "";
      } else {
        return res.data.sharedSecrets.storageNoncePublicKey;
      }
    });
}

// The `last` flag is used to fetch the ownerships of the last transaction of the chain
/**
 * Get the ownerships of a transaction
 * @param address address to get the ownerships of
 * @param endpoint The Archethic API endpoint
 * @param last If true, get the ownerships of the last transaction of the chain
 */
export async function getTransactionOwnerships(
  address: string | Uint8Array,
  endpoint: string,
  last: boolean = false
): Promise<Ownership[]> {
  address = maybeUint8ArrayToHex(address);

  const url = new URL("/api", endpoint);
  const field = last ? "lastTransaction" : "transaction";
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    ${field}(address: "${address}") {
                      data {
                        ownerships {
                          secret,
                          authorizedPublicKeys {
                            encryptedSecretKey,
                            publicKey
                          }
                        }
                      }
                    }
                }`
    })
  })
    .then(handleResponse)
    .then((res): Ownership[] => {
      if (res.errors || res.data == null) {
        return [];
      } else {
        return res.data[field].data.ownerships;
      }
    });
}

/**
 * Get token information
 * @param tokenAddress address of the token
 * @param endpoint The Archethic API endpoint
 */
export async function getToken(tokenAddress: string | Uint8Array, endpoint: string): Promise<{} | Token> {
  tokenAddress = maybeUint8ArrayToHex(tokenAddress);

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    token(address: "${tokenAddress}") {
                      genesis, name, symbol, supply, type
                      properties, collection, id, decimals
                    }
              }`
    })
  })
    .then(handleResponse)
    .then((res): Token | {} => {
      if (res.errors || res.data == null) {
        return {}; // TODO : return null ?
      } else {
        return res.data.token;
      }
    });
}

/**
 * Get Oracle data
 * @param endpoint The Archethic API endpoint
 * @param timestamp The timestamp of the data to get
 */
export async function getOracleData(endpoint: string, timestamp: undefined | number = undefined): Promise<OracleData> {
  let query;

  if (timestamp === undefined) {
    query = `query {
                    oracleData {
                        timestamp,
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`;
  } else {
    query = `query {
                    oracleData(timestamp: ${timestamp}) {
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`;
  }

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: query
    })
  })
    .then(handleResponse)
    .then((res): OracleData => {
      if (res.data.oracleData == null) {
        return { services: {} };
      } else {
        return res.data.oracleData;
      }
    });
}

/**
 * Subscribe to oracle updates
 * @param endpoint The Archethic API endpoint
 * @param handler The handler to call when a new update is received
 */
export async function subscribeToOracleUpdates(endpoint: string, handler: Function): Promise<any> {
  const { host, protocol } = new URL(endpoint);
  const ws_protocol = protocol == "https:" ? "wss" : "ws";

  const absintheSocket = absinthe.create(`${ws_protocol}://${host}/socket`);

  const operation = `
      subscription {
        oracleUpdate {
          timestamp,
          services {
            uco {
              eur,
              usd
            }
          }
        }
      }
      `;
  const notifier = absinthe.send(absintheSocket, operation);

  return absinthe.observe(absintheSocket, notifier, (result: any) => {
    handler(result.data.oracleUpdate);
  });
}

/**
 * Get the balance of an address
 * @param endpoint The Archethic API endpoint
 * @param address The address to get the balance of
 */
export async function getBalance(address: string | Uint8Array, endpoint: string): Promise<Balance> {
  address = maybeUint8ArrayToHex(address);

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: `query {
                    balance(address: "${address}") {
                      uco,
                      token {
                        address,
                        amount,
                        tokenId
                      }
                    }
              }`
    })
  })
    .then(handleResponse)
    .then((res): Balance => {
      if (res.errors || res.data == null) {
        return { uco: 0, token: [] };
      } else {
        return res.data.balance;
      }
    });
}

/**
 * handle an api response
 * @param response
 */
async function handleResponse(response: Response): Promise<any> {
  return new Promise(function (resolve, reject) {
    if (response.status >= 200 && response.status <= 299) {
      response.json().then(resolve);
    } else {
      reject(response.statusText);
    }
  });
}
