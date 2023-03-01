import fetch from "cross-fetch";
import absinthe from "./api/absinthe.cjs";
import { maybeUint8ArrayToHex } from "./utils.js";

export async function getNearestEndpoints(endpoint) {
  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `query {
                    nearestEndpoints {
                        ip,
                        port
                    }
                }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data.nearestEndpoints == null) {
        return [];
      } else {
        return res.data.nearestEndpoints;
      }
    });
}

export async function getTransactionIndex(address, endpoint) {
  address = maybeUint8ArrayToHex(address)

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `query {
                    lastTransaction(address: "${address}") {
                        chainLength
                    }
                }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data.lastTransaction == null) {
        return 0;
      } else {
        return res.data.lastTransaction.chainLength;
      }
    });
}

export async function getStorageNoncePublicKey(endpoint) {
  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data.sharedSecrets == null) {
        return "";
      } else {
        return res.data.sharedSecrets.storageNoncePublicKey;
      }
    });
}

export async function getTransactionFee(tx, endpoint) {
  const url = new URL("/api/transaction_fee", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: tx.toJSON(),
  }).then(handleResponse);
}

// The `last` flag is used to fetch the ownerships of the last transaction of the chain
export async function getTransactionOwnerships(address, endpoint, last = false) {
  address = maybeUint8ArrayToHex(address)

  const url = new URL("/api", endpoint);
  const field = last ? "lastTransaction" : "transaction"
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
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
                }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data == null) {
        return [];
      } else {
        return res.data[field].data.ownerships;
      }
    });
}

export async function getToken(tokenAddress, endpoint) {
  tokenAddress = maybeUint8ArrayToHex(tokenAddress)

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `query {
                    token(address: "${tokenAddress}") {
                      genesis, name, symbol, supply, type
                      properties, collection, id, decimals
                    }
              }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data == null) {
        return [];
      } else {
        return res.data.token;
      }
    });
}

export async function addOriginKey(originPublicKey, certificate, endpoint) {
  originPublicKey = maybeUint8ArrayToHex(originPublicKey)

  if (typeof certificate !== "string") {
    throw "'certificate' must be a string";
  }

  const url = new URL("/api/origin_key", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      origin_public_key: originPublicKey,
      certificate: certificate,
    }),
  }).then(handleResponse);
}

export async function getOracleData(endpoint, timestamp = undefined) {
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
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: query,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.data.oracleData == null) {
        return {};
      } else {
        return res.data.oracleData;
      }
    });
}

export async function subscribeToOracleUpdates(endpoint, handler) {
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

  return absinthe.observe(absintheSocket, notifier, (result) => {
    handler(result.data.oracelUpdate);
  });
}

export async function getBalance(endpoint, address) {
  if (typeof address !== "string" && !(address instanceof Uint8Array)) {
    throw "'address' must be a string or Uint8Array";
  }

  if (typeof address == "string") {
    if (!isHex(address)) {
      throw "'address' must be in hexadecimal form if it's string";
    }
  }

  address = maybeUint8ArrayToHex(address)

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
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
              }`,
    }),
  })
    .then(handleResponse)
    .then((res) => {
      if (res.errors || res.data == null) {
        return { uco: 0, token: [] };
      } else {
        return res.data.balance;
      }
    });

}

async function handleResponse(response) {
  return new Promise(function(resolve, reject) {
    if (response.status >= 200 && response.status <= 299) {
      response.json().then(resolve);
    } else {
      reject(response.statusText);
    }
  });
}
