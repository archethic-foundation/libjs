import { Endpoint, WalletRPCEndpoint } from "../src/endpoint";
import { ArchethicRPCClient } from "../src/api/wallet_rpc";

describe("Endpoint", () => {
    it("should create a non RPC endpoint", () => {
        const endpoint = Endpoint.build("http://localhost:4000");

        expect(endpoint.isRpcAvailable).toBe(false)
        //expect(endpoint.rpcClient).toBeUndefined() Not necessary to test because typing

    });

    it("should create an RPC endpoint", () => {
        const endpoint = Endpoint.build("ws://localhost:12345");
        expect(endpoint.isRpcAvailable).toBe(true)

        if (endpoint instanceof WalletRPCEndpoint) {
            expect(endpoint.rpcClient).toBeInstanceOf(ArchethicRPCClient)
        }
    });
});
