require('dotenv').config();
const { RpcProvider, Account, Contract, CallData } = require('starknet');
const { generateZKProof } = require('./generate_proof');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:5050';
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
    console.log('🚀 Starting StarkAccess ZK Protocol Demo...');

    if (!ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        console.error('\n❌ Please set ACCOUNT_ADDRESS and PRIVATE_KEY in demo/.env');
        console.log('Hint: Run `starknet-devnet --seed 42` and copy the first account credentials.');
        process.exit(1);
    }

    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({ provider, address: ACCOUNT_ADDRESS, signer: PRIVATE_KEY });
    console.log(`✅ Connected to account: ${account.address}`);

    // ─── Part 0: Generate real ZK Proof ─────────────────────────────────────────
    console.log('\n🔮 Generating ZK Proof from Noir circuit...');
    const zkProof = await generateZKProof();
    console.log('✅ Circuit constraints satisfied — proof ready!');

    const ROOT = zkProof.root;
    const ACTION_HASH = zkProof.actionHash;
    const NULLIFIER = zkProof.nullifier;
    const PROOF_FELTS = zkProof.proofFelts;

    // ─── Part 1: Contract Deployments ───────────────────────────────────────────
    const contractsDir = path.join(__dirname, '../contracts/target/dev');

    const readJson = name =>
        JSON.parse(fs.readFileSync(path.join(contractsDir, name)).toString());

    const verifierSierra = readJson('accessmanager_zk_contracts_MockVerifier.contract_class.json');
    const verifierCasm = readJson('accessmanager_zk_contracts_MockVerifier.compiled_contract_class.json');

    console.log('\n⏳ Deploying MockVerifier...');
    const verifierDeploy = await account.declareAndDeploy({ contract: verifierSierra, casm: verifierCasm });
    const verifierAddress = verifierDeploy.deploy.contract_address;
    console.log(`✅ MockVerifier deployed at: ${verifierAddress}`);

    const managerSierra = readJson('accessmanager_zk_contracts_AccessManagerZK.contract_class.json');
    const managerCasm = readJson('accessmanager_zk_contracts_AccessManagerZK.compiled_contract_class.json');

    console.log('\n⏳ Deploying AccessManagerZK...');
    const managerDeploy = await account.declareAndDeploy({
        contract: managerSierra,
        casm: managerCasm,
        constructorCalldata: CallData.compile([verifierAddress, ACCOUNT_ADDRESS]),
    });
    const managerAddress = managerDeploy.deploy.contract_address;
    console.log(`✅ AccessManagerZK deployed at: ${managerAddress}`);

    const treasurySierra = readJson('accessmanager_zk_contracts_ProtectedTreasury.contract_class.json');
    const treasuryCasm = readJson('accessmanager_zk_contracts_ProtectedTreasury.compiled_contract_class.json');

    console.log('\n⏳ Deploying ProtectedTreasury...');
    // initialBalance is already u256 in contracts, starknet.js handles numbers/bigints
    const initialBalance = 10000n;
    const treasuryDeploy = await account.declareAndDeploy({
        contract: treasurySierra,
        casm: treasuryCasm,
        constructorCalldata: CallData.compile([managerAddress, initialBalance, ACCOUNT_ADDRESS]),
    });
    const treasuryAddress = treasuryDeploy.deploy.contract_address;
    console.log(`✅ ProtectedTreasury deployed at: ${treasuryAddress}`);

    // ─── Part 2: Protocol Setup ──────────────────────────────────────────────────
    console.log('\n⚙️  Setting up Protocol Roles...');
    const treasuryContract = new Contract({
        abi: treasurySierra.abi,
        address: treasuryAddress,
        providerOrAccount: account,
    });

    // Register the Merkle root derived from the circuit (Poseidon hash of the secret leaf)
    console.log(`📡 Treasury registering Merkle Root: 0x${ROOT.toString(16)}`);
    const setupTx = await treasuryContract.setup_role_root(ROOT);
    await provider.waitForTransaction(setupTx.transaction_hash);
    console.log('✅ Setup Transaction Confirmed!');

    // ─── Part 3: ZK Proof Withdrawal ────────────────────────────────────────────
    console.log('\n👤 User submitting ZK Proof to withdraw...');
    console.log(`🔐 action_hash: ${ACTION_HASH}  nullifier: 0x${NULLIFIER.toString(16).slice(0, 12)}...`);

    const publicInputs = [ROOT, ACTION_HASH, NULLIFIER];

    const balanceBefore = await treasuryContract.get_balance();
    console.log(`\n💸 Withdraw 500 tokens...`);
    // get_balance returns u256, which starknet.js returns as BigInt
    console.log(`💰 Treasury Balance Before: ${balanceBefore.toString()}`);

    try {
        const withdrawTx = await treasuryContract.withdraw(500n, PROOF_FELTS, publicInputs);
        console.log(`⏳ Waiting for Tx: ${withdrawTx.transaction_hash}`);
        await provider.waitForTransaction(withdrawTx.transaction_hash);
        console.log('✅ Withdrawal Successful!');

        const balanceAfter = await treasuryContract.get_balance();
        console.log(`💰 Treasury Balance After: ${balanceAfter.toString()}`);

        // ─── Part 4: Replay Attack Test ─────────────────────────────────────────
        console.log('\n🔁 Replay Attack Simulation: re-submitting same nullifier...');
        try {
            const replayTx = await treasuryContract.withdraw(500n, PROOF_FELTS, publicInputs);
            await provider.waitForTransaction(replayTx.transaction_hash);
            console.error('🚨 SECURITY FAILURE: Replay attack succeeded!');
        } catch (_e) {
            console.log('✅ Expected Failure: Nullifier already used — replay attack blocked!');
        }

    } catch (e) {
        console.error('❌ Withdrawal Failed:', e.message || e);
    }

    console.log('\n🎉 Demo complete!');
}

main().catch(console.error);
