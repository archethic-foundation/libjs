#!/usr/bin/env node

/**
 * End-to-end WASM smart contract upgrade test (simple wallet mode)
 *
 * Uses 2 simple seed-based wallets (no keychain):
 *   - contractSeed: "test_contract_N" — the contract chain
 *   - callerSeed: "test_caller" — sends actions + upgrades
 *
 * Steps:
 *   1. Fund caller wallet via faucet
 *   2. Fund contract wallet from caller
 *   3. Deploy v1 (inc + getCounter) with upgradeOpts.from = caller
 *   4. Test inc(5) => getCounter = 5
 *   5. Upgrade to v2 (inc + mul + getCounter)
 *   6. Test mul(3) => getCounter = 15
 *   7. Test inc(2) => getCounter = 17
 *
 * Usage:
 *   node test_wasm_upgrade.mjs <v1.wasm> <v1_manifest.json> <v2.wasm> <v2_manifest.json>
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import Archethic, { Crypto, Utils } from "../../dist/index.js";
import { Contract, newContractTransaction, updateContractTransaction } from "../../dist/contract.js";
import { originPrivateKey } from "../../dist/utils.js";
import { ENDPOINT, FAUCET_ENDPOINT } from "../shared.mjs";

const STATE_FILE = "test_sc_state.json";

// ── CLI args ──────────────────────────────────────────────────────────
const [v1Wasm, v1Manifest, v2Wasm, v2Manifest] = process.argv.slice(2);

if (!v1Wasm || !v1Manifest || !v2Wasm || !v2Manifest) {
  console.error("Usage: node test_wasm_upgrade.mjs <v1.wasm> <v1_manifest.json> <v2.wasm> <v2_manifest.json>");
  process.exit(1);
}

for (const f of [v1Wasm, v1Manifest, v2Wasm, v2Manifest]) {
  if (!existsSync(f)) { console.error(`File not found: ${f}`); process.exit(1); }
}

// ── Helpers ───────────────────────────────────────────────────────────
function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf-8")) : { nextIndex: 1 };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function step(n, msg) { console.log(`\n── Step ${n}: ${msg} ──`); }
function ok(msg) { console.log(`   OK: ${msg}`); }
function info(msg) { console.log(`   ${msg}`); }

function seedToGenesis(seed) {
  return Utils.uint8ArrayToHex(Crypto.deriveAddress(seed, 0));
}

function sendTx(tx, label) {
  return new Promise((resolve, reject) => {
    tx.on("sent", () => info(`${label} sent...`))
      .on("requiredConfirmation", () => {
        ok(`${label} confirmed: ${Utils.uint8ArrayToHex(tx.address)}`);
        resolve();
      })
      .on("error", (ctx, err) => reject(new Error(`${label}: ${err.message || err.data || JSON.stringify(err)}`)))
      .on("timeout", () => reject(new Error(`${label} timeout`)))
      .send(100, 60);
  });
}

async function faucet(address) {
  const resp = await fetch(`${FAUCET_ENDPOINT}/api/faucet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(`Faucet error: ${body.error}`);
  return body.tx_address;
}

async function waitBalance(archethic, address, minAmount, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    const balance = await archethic.network.getBalance(address);
    const nug = BigInt(balance.nug || 0);
    if (nug >= minAmount) return nug;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Balance did not reach minimum after ${maxRetries} retries`);
}

async function callFunction(archethic, contractAddress, functionName, args = []) {
  return await archethic.contract.callFunction(contractAddress, functionName, args);
}

/**
 * Send an action and wait for contract state update using the new SDK API
 */
async function sendActionAndWaitState(archethic, callerSeed, contractAddress, actionName, actionArgs, stateFunction) {
  info(`Sending ${actionName}(${JSON.stringify(actionArgs)})...`);

  const { actionTxAddress, state } = await archethic.contract.sendActionAndWait(
    contractAddress,
    actionName,
    actionArgs,
    callerSeed,
    { stateFunction, pollInterval: 2000, pollTimeout: 60000 }
  );

  ok(`${actionName} confirmed: ${actionTxAddress}`);
  info(`State updated: ${stateFunction} = ${state}`);
  return state;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const state = loadState();
  const scIndex = state.nextIndex;

  // Save immediately so next run uses a fresh index
  state.nextIndex = scIndex + 1;
  saveState(state);

  const contractSeed = `test_contract_${scIndex}`;
  const callerSeed = "test_caller";

  const contractGenesisHex = seedToGenesis(contractSeed);
  const callerGenesisHex = seedToGenesis(callerSeed);

  console.log("=== WASM Smart Contract Upgrade Test ===");
  console.log(`Endpoint:        ${ENDPOINT}`);
  console.log(`Contract seed:   ${contractSeed}`);
  console.log(`Contract genesis: ${contractGenesisHex}`);
  console.log(`Caller genesis:  ${callerGenesisHex}`);
  console.log(`v1:              ${v1Wasm}`);
  console.log(`v2:              ${v2Wasm}`);

  const archethic = new Archethic(ENDPOINT);
  await archethic.connect();

  // ── Step 1: Fund caller via faucet ───────────────────────────────
  step(1, "Fund caller wallet via faucet");

  const callerBalance = await archethic.network.getBalance(callerGenesisHex);
  const callerNug = BigInt(callerBalance.nug || 0);
  info(`Caller balance: ${Utils.formatBigInt(callerNug)} NUG`);

  if (callerNug < Utils.parseBigInt("10")) {
    info("Requesting faucet for caller...");
    const faucetTx = await faucet(callerGenesisHex);
    ok(`Faucet TX: ${faucetTx}`);
    await waitBalance(archethic, callerGenesisHex, Utils.parseBigInt("10"));
    ok("Caller funded");
  } else {
    ok("Already funded");
  }

  // ── Step 2: Fund contract wallet from caller ─────────────────────
  step(2, "Fund contract wallet from caller");

  const contractBalance = await archethic.network.getBalance(contractGenesisHex);
  const contractNug = BigInt(contractBalance.nug || 0);
  info(`Contract balance: ${Utils.formatBigInt(contractNug)} NUG`);

  if (contractNug < Utils.parseBigInt("5")) {
    const fundAmount = Utils.parseBigInt("10");
    info("Funding contract from caller...");

    const callerIndex = await archethic.transaction.getTransactionIndex(callerGenesisHex);
    const fundTx = archethic.transaction
      .new()
      .setType("transfer")
      .addNUGTransfer(contractGenesisHex, fundAmount)
      .build(callerSeed, callerIndex)
      .originSign(originPrivateKey);

    await sendTx(fundTx, "Fund contract TX");
    await waitBalance(archethic, contractGenesisHex, Utils.parseBigInt("5"));
    ok("Contract funded");
  } else {
    ok("Already funded");
  }

  // ── Step 3: Deploy v1 ────────────────────────────────────────────
  step(3, "Deploy v1 contract (inc + getCounter)");

  const v1Bytecode = new Uint8Array(readFileSync(v1Wasm));
  const v1ManifestData = JSON.parse(readFileSync(v1Manifest, "utf-8"));

  // upgradeOpts.from = caller (so caller can send upgrades)
  v1ManifestData.upgradeOpts = { from: callerGenesisHex };
  info(`upgradeOpts.from = ${callerGenesisHex}`);

  const v1Contract = new Contract(v1Bytecode, v1ManifestData);

  // newContractTransaction handles seed encryption + ownership
  const deployTx = await newContractTransaction(archethic, v1Contract, contractSeed);
  deployTx.originSign(originPrivateKey);

  const deployFee = await archethic.transaction.getTransactionFee(deployTx);
  info(`Deploy fee: ${Utils.formatBigInt(deployFee.fee)} NUG`);

  await sendTx(deployTx, "Deploy v1 TX");
  ok(`v1 deployed at ${contractGenesisHex}`);
  info(`Explorer: ${ENDPOINT}/explorer/chain?address=${contractGenesisHex}`);

  // Wait for contract to be ready
  await new Promise(r => setTimeout(r, 3000));

  const counter0 = await callFunction(archethic, contractGenesisHex, "getCounter");
  info(`Initial getCounter = ${counter0}`);

  // ── Step 4: Test v1 — inc(5) ─────────────────────────────────────
  step(4, "Test v1: inc(5) then getCounter => 5");

  const counter1 = await sendActionAndWaitState(archethic, callerSeed, contractGenesisHex, "inc", { value: 5 }, "getCounter");
  if (counter1 === 5) {
    ok("inc(5) => getCounter = 5");
  } else {
    throw new Error(`Expected getCounter = 5, got ${counter1}`);
  }

  // ── Step 5: Upgrade to v2 ───────────────────────────────────────
  step(5, "Upgrade to v2 (inc + mul + getCounter)");

  const v2Bytecode = new Uint8Array(readFileSync(v2Wasm));
  const v2ManifestData = JSON.parse(readFileSync(v2Manifest, "utf-8"));
  v2ManifestData.upgradeOpts = { from: callerGenesisHex };

  const v2Contract = new Contract(v2Bytecode, v2ManifestData);

  const upgradeTx = updateContractTransaction(archethic, contractGenesisHex, v2Contract);

  const callerIndex2 = await archethic.transaction.getTransactionIndex(callerGenesisHex);
  upgradeTx.build(callerSeed, callerIndex2).originSign(originPrivateKey);

  const upgradeFee = await archethic.transaction.getTransactionFee(upgradeTx);
  info(`Upgrade fee: ${Utils.formatBigInt(upgradeFee.fee)} NUG`);

  await sendTx(upgradeTx, "Upgrade TX");
  ok("Upgraded to v2");

  await new Promise(r => setTimeout(r, 5000));

  const counterAfterUpgrade = await callFunction(archethic, contractGenesisHex, "getCounter");
  info(`getCounter after upgrade = ${counterAfterUpgrade}`);

  // ── Step 6: Test mul(3) => 15 ────────────────────────────────────
  step(6, "Test v2: mul(3) then getCounter => 15");

  const counter2 = await sendActionAndWaitState(archethic, callerSeed, contractGenesisHex, "mul", { value: 3 }, "getCounter");
  if (counter2 === 15) {
    ok("mul(3) => getCounter = 15");
  } else {
    throw new Error(`Expected getCounter = 15, got ${counter2}`);
  }

  // ── Step 7: Test inc(2) => 17 ────────────────────────────────────
  step(7, "Test v2: inc(2) then getCounter => 17");

  const counter3 = await sendActionAndWaitState(archethic, callerSeed, contractGenesisHex, "inc", { value: 2 }, "getCounter");
  if (counter3 === 17) {
    ok("inc(2) => getCounter = 17");
  } else {
    throw new Error(`Expected getCounter = 17, got ${counter3}`);
  }

  // ── Done ─────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log("  ALL TESTS PASSED");
  console.log(`  Contract: ${contractSeed} (${contractGenesisHex})`);
  console.log(`  Explorer: ${ENDPOINT}/explorer/chain?address=${contractGenesisHex}`);
  console.log("══════════════════════════════════════\n");

  process.exit(0);
}

main().catch(err => {
  console.error(`\nFAILED: ${err.message || err}`);
  process.exit(1);
});
