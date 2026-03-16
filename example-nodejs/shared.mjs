/**
 * Shared paths and utilities for all example scripts.
 * Data files (wallets, contracts, tokens) are stored in example-nodejs/ root.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const WALLETS_FILE = join(__dirname, "wallets.json");
export const CONTRACTS_FILE = join(__dirname, "contracts.json");
export const TOKENS_FILE = join(__dirname, "tokens.json");
export const KEYCHAINS_FILE = join(__dirname, "keychains.json");

export const ENDPOINT = process.env.ARCHETHIC_ENDPOINT || "http://localhost:4000";
export const FAUCET_ENDPOINT = process.env.FAUCET_ENDPOINT || ENDPOINT;

export function loadJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")) : {};
}

export function saveJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}
