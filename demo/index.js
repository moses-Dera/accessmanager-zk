require('dotenv').config();
const { RpcProvider, Account, Contract, CallData } = require('starknet');
const fs = require('fs');
const path = require('path');

// Local devnet RPC
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:5050";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
    console.log("🚀 Starting StarkAccess ZK Protocol Demo...");

    if (!ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        console.error("\n❌ Please set ACCOUNT_ADDRESS and PRIVATE_KEY in demo/.env");
        console.log("Hint: Run `starknet-devnet --seed 42` and copy the first account's credentials.");
        process.exit(1);
    }

    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    // starknet.js v9 uses options object: { provider, address, signer }
    const account = new Account({ provider, address: ACCOUNT_ADDRESS, signer: PRIVATE_KEY });
    console.log(`✅ Connected to account: ${account.address}`);

    // --- Part 1: Contract Deployments ---
    const contractsDir = path.join(__dirname, "../contracts/target/dev");

    const verifierSierra = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_MockVerifier.contract_class.json")).toString());
    const verifierCasm = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_MockVerifier.compiled_contract_class.json")).toString());

    console.log("\n⏳ Deploying MockVerifier...");
    const verifierDeployResponse = await account.declareAndDeploy({ contract: verifierSierra, casm: verifierCasm });
    const verifierAddress = verifierDeployResponse.deploy.contract_address;
    console.log(`✅ MockVerifier deployed at: ${verifierAddress}`);

    const managerSierra = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_AccessManagerZK.contract_class.json")).toString());
    const managerCasm = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_AccessManagerZK.compiled_contract_class.json")).toString());

    console.log("\n⏳ Deploying AccessManagerZK...");
    const managerDeployResponse = await account.declareAndDeploy({
        contract: managerSierra,
        casm: managerCasm,
        constructorCalldata: CallData.compile([verifierAddress])
    });
    const managerAddress = managerDeployResponse.deploy.contract_address;
    console.log(`✅ AccessManagerZK deployed at: ${managerAddress}`);

    const treasurySierra = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_ProtectedTreasury.contract_class.json")).toString());
    const treasuryCasm = JSON.parse(fs.readFileSync(path.join(contractsDir, "accessmanager_zk_contracts_ProtectedTreasury.compiled_contract_class.json")).toString());

    console.log("\n⏳ Deploying ProtectedTreasury...");
    const initialBalance = 10000;
    const treasuryDeployResponse = await account.declareAndDeploy({
        contract: treasurySierra,
        casm: treasuryCasm,
        constructorCalldata: CallData.compile([managerAddress, initialBalance, ACCOUNT_ADDRESS])
    });
    const treasuryAddress = treasuryDeployResponse.deploy.contract_address;
    console.log(`✅ ProtectedTreasury deployed at: ${treasuryAddress}`);

    // --- Part 2: Protocol Setup ---
    console.log("\n⚙️  Setting up Protocol Roles...");

    // starknet.js v9: Contract({ abi, address, providerOrAccount })
    const treasuryContract = new Contract({ abi: treasurySierra.abi, address: treasuryAddress, providerOrAccount: account });

    const merkleRoot = 12345678n; // Simulated off-chain Merkle root
    console.log(`📡 Treasury registering Authorized Users Merkle Root: ${merkleRoot}`);
    const setupTx = await treasuryContract.setup_role_root(merkleRoot);
    await provider.waitForTransaction(setupTx.transaction_hash);
    console.log(`✅ Setup Transaction Confirmed!`);

    // --- Part 3: ZK Proof Flow (Simulated) ---
    console.log("\n👤 User Generating ZK Proof (Simulated)...");
    const simulatedActionHash = 999n;
    const simulatedNullifier = BigInt(Math.floor(Math.random() * 1_000_000));
    const simulatedProof = [1n]; // MockVerifier accepts any non-empty proof
    const publicInputs = [merkleRoot, simulatedActionHash, simulatedNullifier];

    console.log(`🔐 Proof: action_hash=${simulatedActionHash}, nullifier=${simulatedNullifier}`);
    console.log("\n💸 User attempting protected action: Withdraw 500 tokens...");

    const balanceBefore = await treasuryContract.get_balance();
    console.log(`💰 Treasury Balance Before: ${balanceBefore}`);

    try {
        const withdrawTx = await treasuryContract.withdraw(500, simulatedProof, publicInputs);
        console.log(`⏳ Waiting for Tx: ${withdrawTx.transaction_hash}`);
        await provider.waitForTransaction(withdrawTx.transaction_hash);
        console.log("✅ Withdrawal Successful!");

        const balanceAfter = await treasuryContract.get_balance();
        console.log(`💰 Treasury Balance After: ${balanceAfter}`);

        // --- Part 4: Replay Attack Test ---
        console.log("\n🔁 Replay Attack Simulation: attempting same withdrawal again...");
        try {
            const failedTx = await treasuryContract.withdraw(500, simulatedProof, publicInputs);
            await provider.waitForTransaction(failedTx.transaction_hash);
            console.error("🚨 SECURITY FAILURE: Replay attack succeeded when it should have failed!");
        } catch (e) {
            console.log("✅ Expected Failure: Nullifier already used — replay attack blocked!");
        }

    } catch (e) {
        console.error("❌ Withdrawal Failed:", e);
    }

    console.log("\n🎉 Demo complete!");
}

main().catch(console.error);
