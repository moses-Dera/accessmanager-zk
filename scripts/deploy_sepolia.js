#!/usr/bin/env node
/**
 * deploy_sepolia.js — Deploy StarkAccess Protocol to Starknet Sepolia Testnet
 *
 * Prerequisites:
 *   1. Set ACCOUNT_ADDRESS, PRIVATE_KEY in demo/.env  (Sepolia account with ETH)
 *   2. Set RPC_URL to a Sepolia RPC endpoint (see .env.example)
 *   3. Build contracts: cd contracts && scarb build
 *
 * Run:
 *   cd demo && node ../scripts/deploy_sepolia.js
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../demo/.env') });

const { RpcProvider, Account, Contract, CallData } = require('starknet');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACTS_DIR = path.join(__dirname, '../contracts/target/dev');

function readJson(name) {
    const p = path.join(CONTRACTS_DIR, name);
    if (!fs.existsSync(p)) throw new Error(`Missing: ${p}. Run: cd contracts && scarb build`);
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function main() {
    console.log('🌐 StarkAccess Protocol — Sepolia Deployment');
    console.log('============================================');

    if (!RPC_URL || !ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        console.error('❌ Missing env vars. Set SEPOLIA_RPC_URL, ACCOUNT_ADDRESS, PRIVATE_KEY in demo/.env');
        console.error('   Example Sepolia RPCs: https://starknet-sepolia.public.blastapi.io');
        process.exit(1);
    }

    console.log(`📡 RPC: ${RPC_URL}`);
    console.log(`🔑 Account: ${ACCOUNT_ADDRESS}\n`);

    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({ provider, address: ACCOUNT_ADDRESS, signer: PRIVATE_KEY });

    // Verify connection
    const chainId = await provider.getChainId();
    console.log(`✅ Connected. Chain ID: ${chainId}`);
    if (chainId !== '0x534e5f5345504f4c4941') {
        console.warn('⚠  Warning: This does not look like Sepolia (SN_SEPOLIA). Proceed with caution.');
    }

    const deployments = {};

    // ── 1. MockVerifier ─────────────────────────────────────────────────────────
    console.log('\n⏳ [1/3] Deploying MockVerifier...');
    const vSierra = readJson('accessmanager_zk_contracts_MockVerifier.contract_class.json');
    const vCasm = readJson('accessmanager_zk_contracts_MockVerifier.compiled_contract_class.json');
    const vDeploy = await account.declareAndDeploy({ contract: vSierra, casm: vCasm });
    deployments.MockVerifier = vDeploy.deploy.contract_address;
    console.log(`✅ MockVerifier: ${deployments.MockVerifier}`);
    console.log(`   Tx: ${vDeploy.deploy.transaction_hash}`);
    console.log(`   🔗 https://sepolia.starkscan.co/contract/${deployments.MockVerifier}`);

    // ── 2. AccessManagerZK ─────────────────────────────────────────────────────
    console.log('\n⏳ [2/3] Deploying AccessManagerZK...');
    const mSierra = readJson('accessmanager_zk_contracts_AccessManagerZK.contract_class.json');
    const mCasm = readJson('accessmanager_zk_contracts_AccessManagerZK.compiled_contract_class.json');
    const mDeploy = await account.declareAndDeploy({
        contract: mSierra, casm: mCasm,
        constructorCalldata: CallData.compile([deployments.MockVerifier]),
    });
    deployments.AccessManagerZK = mDeploy.deploy.contract_address;
    console.log(`✅ AccessManagerZK: ${deployments.AccessManagerZK}`);
    console.log(`   Tx: ${mDeploy.deploy.transaction_hash}`);
    console.log(`   🔗 https://sepolia.starkscan.co/contract/${deployments.AccessManagerZK}`);

    // ── 3. ProtectedTreasury ───────────────────────────────────────────────────
    console.log('\n⏳ [3/3] Deploying ProtectedTreasury...');
    const tSierra = readJson('accessmanager_zk_contracts_ProtectedTreasury.contract_class.json');
    const tCasm = readJson('accessmanager_zk_contracts_ProtectedTreasury.compiled_contract_class.json');
    const initialBalance = 10000;
    const tDeploy = await account.declareAndDeploy({
        contract: tSierra, casm: tCasm,
        constructorCalldata: CallData.compile([
            deployments.AccessManagerZK,
            initialBalance,
            ACCOUNT_ADDRESS, // owner
        ]),
    });
    deployments.ProtectedTreasury = tDeploy.deploy.contract_address;
    console.log(`✅ ProtectedTreasury: ${deployments.ProtectedTreasury}`);
    console.log(`   Tx: ${tDeploy.deploy.transaction_hash}`);
    console.log(`   🔗 https://sepolia.starkscan.co/contract/${deployments.ProtectedTreasury}`);

    // ── Save deployment record ─────────────────────────────────────────────────
    const record = {
        network: 'sepolia',
        chainId,
        timestamp: new Date().toISOString(),
        deployer: ACCOUNT_ADDRESS,
        contracts: deployments,
    };

    const outPath = path.join(__dirname, '../docs/deployments.json');
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));

    console.log('\n🎉 All contracts deployed!');
    console.log('\n📋 Deployment Summary:');
    console.log('─────────────────────────────────────────────');
    Object.entries(deployments).forEach(([name, addr]) => {
        console.log(`  ${name.padEnd(22)} ${addr}`);
    });
    console.log('\n💾 Saved to docs/deployments.json');
    console.log('\nNext steps:');
    console.log('  1. Update frontend/index.html with these contract addresses');
    console.log('  2. Call setup_role_root() on the Treasury with your Merkle root');
    console.log('  3. Share the frontend and let users anonymously withdraw!');
}

main().catch(e => {
    console.error('❌ Deployment failed:', e.message || e);
    process.exit(1);
});
