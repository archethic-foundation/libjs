import { ArchethicWalletClient } from "../src/api/wallet_rpc";
import { AWCEndpoint, EndpointFactory } from "../src/endpoint";

describe("EndpointFactory", () => {
  it("should create a non RPC endpoint", () => {
    const endpoint = new EndpointFactory().build("http://localhost:4000");

    expect(endpoint.isRpcAvailable).toBe(false);
    //expect(endpoint.rpcClient).toBeUndefined() Not necessary to test because typing
  });

  it("should create an RPC endpoint", () => {
    const endpoint = new EndpointFactory().build(undefined);
    expect(endpoint.isRpcAvailable).toBe(true);

    if (endpoint instanceof AWCEndpoint) {
      expect(endpoint.rpcClient).toBeInstanceOf(ArchethicWalletClient);
    }
  });
});
