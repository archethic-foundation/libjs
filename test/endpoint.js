import Endpoint from "../lib/endpoint.js";

import assert from "assert";
import { ArchethicRPCClient } from "../lib/api/wallet_rpc.js";

describe("Endpoint", () => {
  it("should create a non RPC endpoint", () => {
    const endpoint = Endpoint.build("http://localhost:4000");

    assert.equal(false, endpoint.isRpcAvailable)
    assert.equal(undefined, endpoint.rpcClient)
  });

  it("should create an RPC endpoint", () => {
    const endpoint = Endpoint.build("ws://localhost:12345");

    assert.equal(true, endpoint.isRpcAvailable)
    assert.ok(endpoint.rpcClient instanceof ArchethicRPCClient)
  });
});
