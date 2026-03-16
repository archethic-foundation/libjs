# FHE Smart Contract Examples

Demonstrates Fully Homomorphic Encryption (FHE) in ATSHI smart contracts
using ZAMA TFHE-rs.

## What is FHE?

FHE allows computation on encrypted data without ever decrypting it.
The node processes encrypted values but never sees the plaintext.

## Example: Confidential Counter

A counter that operates on encrypted values — the node increments
the counter without knowing its actual value.

## Scripts

- `test_fhe_contract.mjs` — Deploy and test a confidential counter contract

## Prerequisites

- ATSHI node running with FHE capability
- `wallets.json` in parent directory (run `basics/address_generator.mjs` first)
