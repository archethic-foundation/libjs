import fetch from "cross-fetch";
import { Socket } from "phoenix";
import WebSocket from "isomorphic-ws";

import { isHex, uint8ArrayToHex } from "./utils";

//Use ES5 require, as ES6 import causes `Cannot instantiate an arrow function` error
const withAbsintheSocket = require("@absinthe/socket");

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
  if (typeof address !== "string" && !(address instanceof Uint8Array)) {
    throw "'address' must be a string or Uint8Array";
  }

  if (typeof address == "string") {
    if (!isHex(address)) {
      throw "'address' must be in hexadecimal form if it's string";
    }
  }

  if (address instanceof Uint8Array) {
    address = uint8ArrayToHex(address);
  }

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

export async function getTransactionOwnerships(address, endpoint) {
  if (typeof address !== "string" && !(address instanceof Uint8Array)) {
    throw "'address' must be a string or Uint8Array";
  }

  if (typeof address == "string") {
    if (!isHex(address)) {
      throw "'address' must be in hexadecimal form if it's string";
    }
  }

  if (address instanceof Uint8Array) {
    address = uint8ArrayToHex(address);
  }

  const url = new URL("/api", endpoint);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: `query {
                    transaction(address: "${address}") {
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
        return res.data.transaction.data.ownerships;
      }
    });
}

export async function addOriginKey(originPublicKey, certificate, endpoint) {
  if (
    typeof originPublicKey !== "string" &&
    !(originPublicKey instanceof Uint8Array)
  ) {
    throw "'originPublicKey' must be a string or Uint8Array";
  }

  if (typeof originPublicKey == "string") {
    if (!isHex(originPublicKey)) {
      throw "'originPublicKey' must be in hexadecimal form if it's string";
    }
  }

  if (originPublicKey instanceof Uint8Array) {
    originPublicKey = uint8ArrayToHex(originPublicKey);
  }

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

  const webSocket = new Socket(`${ws_protocol}://${host}/socket`, {
    transport: WebSocket,
  });

  const absintheSocket = withAbsintheSocket.create(webSocket);

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
  const notifier = withAbsintheSocket.send(absintheSocket, { operation });

  return new Promise((resolve, reject) => {
    withAbsintheSocket.observe(absintheSocket, notifier, {
      onStart: function () {
        resolve();
      },
      onError: function (err) {
        reject(err);
      },

      onResult: function (result) {
        handler(result.data.oracleUpdate);
      },
    });
  });
}

async function handleResponse(response) {
  return new Promise(function (resolve, reject) {
    if (response.status >= 200 && response.status <= 299) {
      response.json().then(resolve);
    } else {
      reject(response.statusText);
    }
  });
}
