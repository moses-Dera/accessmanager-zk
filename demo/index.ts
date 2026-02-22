import { RpcProvider, Account, Contract, CallData, cairo } from 'starknet';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Local devnet RPC
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:5050";

// TODO: Replace these with the details from `starknet-devnet`
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
    console.log("🚀 Starting StarkAccess ZK Protocol Demo...");

    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    if (!ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        console.error("\n❌ Please provide a valid ACCOUNT_ADDRESS and PRIVATE_KEY in .env or via environment variables.");
        process.exit(1);
    }

    if (ACCOUNT_ADDRESS.includes("YOUR_DEVNET_ACCOUNT_ADDRESS")) {
        console.error("\n❌ Please provide a valid ACCOUNT_ADDRESS and PRIVATE_KEY in .env or via environment variables.");
        process.exit(1);
    }

    const account = new Account({
        provider: provider,
        address: ACCOUNT_ADDRESS as string,
        signer: PRIVATE_KEY as string
    });
    console.log(`✅ Connected to account: ${account.address}`);
    // Read compiled Sierra & Casm from the 'contracts' directory
    const verifierSierra = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_MockVerifier.contract_class.json")).toString("ascii"));
    const verifierCasm = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_MockVerifier.compiled_contract_class.json")).toString("ascii"));

    console.log("\n⏳ Deploying MockVerifier...");
    const verifierDeployResponse = await account.declareAndDeploy({
        contract: verifierSierra,
        casm: verifierCasm,
    });
    const verifierAddress = verifierDeployResponse.deploy.contract_address;
    console.log(`✅ MockVerifier deployed at: ${verifierAddress}`);

    console.log("\n⏳ Deploying AccessManagerZK...");
    const managerSierra = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_AccessManagerZK.contract_class.json")).toString("ascii"));
    const managerCasm = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_AccessManagerZK.compiled_contract_class.json")).toString("ascii"));

    const managerDeployResponse = await account.declareAndDeploy({
        contract: managerSierra,
        casm: managerCasm,
        constructorCalldata: CallData.compile([verifierAddress])
    });
    const managerAddress = managerDeployResponse.deploy.contract_address;
    console.log(`✅ AccessManagerZK deployed at: ${managerAddress}`);

    console.log("\n⏳ Deploying ProtectedTreasury DApp...");
    const treasurySierra = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_ProtectedTreasury.contract_class.json")).toString("ascii"));
    const treasuryCasm = JSON.parse(fs.readFileSync(path.join(__dirname, "../contracts/target/dev/accessmanager_zk_contracts_ProtectedTreasury.compiled_contract_class.json")).toString("ascii"));

    const initialBalance = 10000;
    const treasuryDeployResponse = await account.declareAndDeploy({
        contract: treasurySierra,
        casm: treasuryCasm,
        constructorCalldata: CallData.compile([managerAddress, initialBalance])
    });
    const treasuryAddress = treasuryDeployResponse.deploy.contract_address;
    console.log(`✅ ProtectedTreasury deployed at: ${treasuryAddress}`);

    // --- Part 2: Protocol Setup ---

    console.log("\n⚙️ Setting up Protocol Roles...");
    const treasuryContract = new Contract({
        abi: treasurySierra.abi,
        address: treasuryAddress,
        providerOrAccount: account
    });

    // Simulate an off-chain Merkle Tree calculation
    const merkleRoot = 12345678n; // Example root
    console.log(`📡 Treasury registering Authorized Users Merkle Root: ${merkleRoot}`);
    const setupTx = await treasuryContract.setup_role_root(merkleRoot);
    await provider.waitForTransaction(setupTx.transaction_hash);
    console.log(`✅ Setup Transaction Confirmed!`);

    // --- Part 3: User Interaction (The ZK OAuth Flow) ---
    console.log("\n👤 User Generating ZK Proof (Simulated)...");
    const simulatedActionHash = 999n;
    const simulatedNullifier = Math.floor(Math.random() * 1000000); // Prevents replay attacks
    const simulatedProof = [1n]; // Mock Verifier accepts any non-empty array
    const publicInputs = [merkleRoot, simulatedActionHash, simulatedNullifier];

    console.log(`Proof Generated with Action Hash: ${simulatedActionHash}`);
    console.log("\n User attempting protected action: Withdraw 500 tokens...");

    const balanceBefore = await treasuryContract.get_balance();
    console.log(`💰 Treasury Balance Before: ${balanceBefore}`);

    try {
        const withdrawTx = await treasuryContract.withdraw(500, simulatedProof, publicInputs);
        console.log(`⏳ Waiting for withdrawal confirmation... Tx Hash: ${withdrawTx.transaction_hash}`);
        await provider.waitForTransaction(withdrawTx.transaction_hash);
        console.log("✅ Withdrawal Successful!");

        const balanceAfter = await treasuryContract.get_balance();
        console.log(`💰 Treasury Balance After: ${balanceAfter}`);

        console.log("\n❌ Attempting same withdrawal again (Replay Attack Simulation)...");
        try {
            const failedTx = await treasuryContract.withdraw(500, simulatedProof, publicInputs);
            await provider.waitForTransaction(failedTx.transaction_hash);
            console.error("🚨 SECURITY FAILURE: Replay attack succeeded when it should have failed!");
        } catch (e) {
            console.log("✅ Expected Failure: Transaction reverted correctly (Nullifier already used).");
        }

    } catch (e) {
        console.error("❌ Withdrawal Failed:", e);
    }
}

main().catch(console.error);