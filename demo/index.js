import 'dotenv/config';
import { RpcProvider, Account, Contract, CallData } from 'starknet';
import { Identity, MerkleTree, StarkAccessProver, StarkAccessClient } from 'starkaccess-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:5050';
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
    console.log('Starting StarkAccess ZK Protocol Demo (via SDK)...');

    if (!ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        console.error('\n❌ Please set ACCOUNT_ADDRESS and PRIVATE_KEY in demo/.env');
        process.exit(1);
    }

    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({ provider, address: ACCOUNT_ADDRESS, signer: PRIVATE_KEY });
    console.log(`✅ Connected to account: ${account.address}`);

    // ─── Step 1: SDK Identity & Tree Setup ─────────────────────────────────────
    console.log('\n👤 Creating SDK Identity & Merkle Tree...');
    const userSecret = 12345n;
    const identity = new Identity(userSecret);
    const userLeaf = identity.getLeaf();

    // Imagine these are other DAO members
    const otherLeaves = [111n, 222n, 333n];
    const tree = new MerkleTree([userLeaf, ...otherLeaves], 4);
    const root = tree.getRoot();
    console.log(`✅ Merkle Root generated: 0x${root.toString(16)}`);

    // ─── Step 2: Contract Deployments ───────────────────────────────────────────
    const contractsDir = path.join(__dirname, '../contracts/target/dev');
    const readJson = name => JSON.parse(fs.readFileSync(path.join(contractsDir, name)).toString());

    console.log('\n⏳ Deploying Protocol Contracts...');
    const verifierSierra = readJson('accessmanager_zk_contracts_MockVerifier.contract_class.json');
    const verifierCasm = readJson('accessmanager_zk_contracts_MockVerifier.compiled_contract_class.json');
    const verifierDeploy = await account.declareAndDeploy({ contract: verifierSierra, casm: verifierCasm });
    const verifierAddress = verifierDeploy.deploy.contract_address;

    const managerSierra = readJson('accessmanager_zk_contracts_AccessManagerZK.contract_class.json');
    const managerCasm = readJson('accessmanager_zk_contracts_AccessManagerZK.compiled_contract_class.json');
    const managerDeploy = await account.declareAndDeploy({
        contract: managerSierra,
        casm: managerCasm,
        constructorCalldata: CallData.compile([verifierAddress, ACCOUNT_ADDRESS]),
    });
    const managerAddress = managerDeploy.deploy.contract_address;

    const treasurySierra = readJson('accessmanager_zk_contracts_ProtectedTreasury.contract_class.json');
    const treasuryCasm = readJson('accessmanager_zk_contracts_ProtectedTreasury.compiled_contract_class.json');

    const treasuryABI = treasurySierra.abi;
    const treasuryCallData = new CallData(treasuryABI);
    const treasuryConstructorCalldata = treasuryCallData.compile('constructor', {
        access_manager_addr: managerAddress,
        initial_supply: 10000n,
        owner: ACCOUNT_ADDRESS
    });

    const treasuryDeploy = await account.declareAndDeploy({
        contract: treasurySierra,
        casm: treasuryCasm,
        constructorCalldata: treasuryConstructorCalldata,
    });
    const treasuryAddress = treasuryDeploy.deploy.contract_address;
    console.log(`✅ Protocol deployed. Manager at: ${managerAddress}`);

    const sdkClient = new StarkAccessClient(managerAddress, account);

    // ─── Step 3: Protocol Setup (Register Root) ──────────────────────────────────
    console.log('\n📡 Registering Merkle Root via SDK Client...');
    const treasuryContract = new Contract(treasurySierra.abi, treasuryAddress, account);
    // setup_role_root expects a single felt252
    const setupTx = await treasuryContract.setup_role_root(root);
    await provider.waitForTransaction(setupTx.transaction_hash);
    console.log('✅ Role root successfully registered!');

    // ─── Step 4: ZK Proof Generation & Withdrawal ───────────────────────────────
    console.log('\n🔮 Generating ZK Proof using SDK Prover...');
    const circuitPath = path.join(__dirname, '../circuits/target/accessmanager_zk_circuits.json');
    const circuitJson = JSON.parse(fs.readFileSync(circuitPath, 'utf-8'));

    // In the circuit, action_hash is matches our demo identity
    const action = 'withdraw_500_tokens';
    const proofPayload = await StarkAccessProver.generateProof(
        identity,
        tree,
        0, // index of userLeaf
        action,
        circuitJson
    );

    console.log(`🔐 Nullifier (Action Hash): ${proofPayload.nullifier}`);

    const balanceBefore = await treasuryContract.get_balance();
    console.log(`💰 Treasury Balance Before: ${balanceBefore.toString()}`);

    try {
        console.log(`⏳ Submitting withdrawal request...`);
        // The contract's withdraw expects: (amount: u256, proof: Span, public_inputs: Span)
        // Public inputs must match: [root, action_hash, nullifier]
        // Note: the action_hash used in SDK matches the one our circuit expects.

        const actionHashBigInt = StarkAccessProver.hashString(action);

        const withdrawTx = await treasuryContract.withdraw(
            [500, 0], // amount (u256 as two felts)
            [1n],     // proof (Span)
            [root, actionHashBigInt, proofPayload.nullifier] // public_inputs (Span)
        );
        await provider.waitForTransaction(withdrawTx.transaction_hash);
        console.log('✅ Withdrawal Successful!');

        const balanceAfter = await treasuryContract.get_balance();
        console.log(`💰 Treasury Balance After: ${balanceAfter.toString()}`);
    } catch (e) {
        console.error('❌ Withdrawal failed:', e.message || e);
    }

    console.log('\n🎉 SDK Integration Demo complete!');
}

main().catch(console.error);
