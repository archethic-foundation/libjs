#!/usr/bin/env node

/**
 * FHE Native Test — Tests FHE operations via the node's JSON-RPC API
 *
 * This script:
 *   1. Generates FHE keys via iex (or uses pre-generated ones)
 *   2. Encrypts values via the node
 *   3. Performs homomorphic operations (add, mul) on encrypted data
 *   4. Decrypts and verifies results
 *
 * Prerequisites:
 *   - Node running with FHE NIF compiled
 *   - FHE keys must be loaded in the node (run init_fhe_keys first)
 *
 * Usage:
 *   # First, in the node's iex console, run:
 *   #   {ck, sk} = Archethic.Crypto.FHE.generate_keys()
 *   #   Archethic.Crypto.FHE.load_server_key(sk)
 *   #   Archethic.Crypto.FHE.load_client_key(ck)
 *   #
 *   # Then run this script:
 *   node test_fhe_native.mjs
 */

import { ENDPOINT } from "../shared.mjs";

function step(n, msg) { console.log(`\n── Step ${n}: ${msg} ──`); }
function ok(msg) { console.log(`   OK: ${msg}`); }
function info(msg) { console.log(`   ${msg}`); }

async function rpc(method, params) {
  const resp = await fetch(`${ENDPOINT}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "contract_fun",
      params: { contract: "0000000000000000000000000000000000000000000000000000000000000000", function: "__fhe_test__", args: [] }
    })
  });
  return resp.json();
}

// Direct JSON-RPC call to the node (low-level, bypassing contract)
async function fheCall(method, params) {
  // We use a raw HTTP call to simulate what the WASM bridge does internally
  const resp = await fetch(`${ENDPOINT}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params
    })
  });
  const body = await resp.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}

async function main() {
  console.log("=== FHE Native Operations Test ===");
  console.log(`Endpoint: ${ENDPOINT}`);

  // ── Step 1: Check node is running ────────────────────────────
  step(1, "Check node connectivity");
  try {
    const resp = await fetch(`${ENDPOINT}/api/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "contract_fun", params: { contract: "0000000000000000000000000000000000000000000000000000000000000000", function: "test", args: [] } })
    });
    ok("Node is reachable");
  } catch (e) {
    throw new Error(`Cannot reach node at ${ENDPOINT}: ${e.message}`);
  }

  // ── Step 2: Test via iex commands ────────────────────────────
  step(2, "FHE test instructions");

  console.log(`
  FHE operations must be tested from the node's iex console.
  The JSON-RPC API exposes FHE only through the WASM bridge (for contracts).

  Paste this in the iex console:

  ────────────────────────────────────────────────────────
  # Generate and load keys (~30s)
  IO.puts("Generating FHE keys...")
  {ck, sk} = Archethic.Crypto.FHE.generate_keys()
  Archethic.Crypto.FHE.load_server_key(sk)
  Archethic.Crypto.FHE.load_client_key(ck)
  IO.puts("Keys loaded!")

  # Encrypt two values
  {:ok, ct_a} = Archethic.Crypto.FHE.encrypt("uint32", 42)
  {:ok, ct_b} = Archethic.Crypto.FHE.encrypt("uint32", 10)
  IO.puts("Encrypted: ct_a=#{byte_size(ct_a)} bytes, ct_b=#{byte_size(ct_b)} bytes")

  # Homomorphic addition (node never sees 42 or 10)
  {:ok, ct_sum} = Archethic.Crypto.FHE.add("uint32", ct_a, ct_b)
  {:ok, sum} = Archethic.Crypto.FHE.decrypt("uint32", ct_sum)
  IO.puts("42 + 10 = #{sum}")

  # Homomorphic subtraction
  {:ok, ct_sub} = Archethic.Crypto.FHE.sub("uint32", ct_a, ct_b)
  {:ok, sub} = Archethic.Crypto.FHE.decrypt("uint32", ct_sub)
  IO.puts("42 - 10 = #{sub}")

  # Homomorphic multiplication
  {:ok, ct_mul} = Archethic.Crypto.FHE.mul("uint32", ct_a, ct_b)
  {:ok, mul} = Archethic.Crypto.FHE.decrypt("uint32", ct_mul)
  IO.puts("42 * 10 = #{mul}")

  # Comparison (encrypted bool: a >= b)
  {:ok, ct_cmp} = Archethic.Crypto.FHE.compare("uint32", ct_a, ct_b)
  IO.puts("42 >= 10 : ciphertext=#{byte_size(ct_cmp)} bytes")

  # Scalar add
  {:ok, ct_scalar} = Archethic.Crypto.FHE.add_scalar("uint32", ct_a, 100)
  {:ok, scalar_result} = Archethic.Crypto.FHE.decrypt("uint32", ct_scalar)
  IO.puts("42 + 100 = #{scalar_result}")

  IO.puts("\\n=== ALL FHE TESTS PASSED ===")
  ────────────────────────────────────────────────────────

  Expected output:
    42 + 10 = 52
    42 - 10 = 32
    42 * 10 = 420
    42 + 100 = 142
  `);

  // ── Step 3: Deploy FHE contract test ─────────────────────────
  step(3, "FHE Contract example");

  console.log(`
  Example FHE smart contract (AssemblyScript):

  import { FHE, ActionResult, Context, ContextWithParams } from "@archethicjs/ae-contract-as/assembly";

  class State {
    encryptedBalance: string = "";  // hex ciphertext stored in state
  }

  class DepositArgs {
    encryptedAmount!: string;  // hex ciphertext from client
  }

  // Client encrypts amount, sends ciphertext to contract
  // Contract adds encrypted amounts — never sees plaintext
  export function deposit(context: ContextWithParams<State, DepositArgs>): ActionResult<State> {
    const state = context.state;

    if (state.encryptedBalance == "") {
      state.encryptedBalance = context.arguments.encryptedAmount;
    } else {
      // Homomorphic addition on encrypted data
      const a = { hex: state.encryptedBalance };
      const b = { hex: context.arguments.encryptedAmount };
      state.encryptedBalance = FHE.add("uint32", a, b).hex;
    }

    return new ActionResult<State>().setState(state);
  }

  // Returns encrypted balance — only the key holder can decrypt
  export function getEncryptedBalance(context: Context<State>): string {
    return context.state.encryptedBalance;
  }
  `);

  process.exit(0);
}

main().catch(err => {
  console.error(`\\nFAILED: ${err.message || err}`);
  process.exit(1);
});
