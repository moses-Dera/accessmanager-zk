# AccessManager ZK — Zero-Knowledge Authorization for Starknet

> **Hackathon Submission** | Starknet Ecosystem | Privacy & Security Track

---

## The Problem

On Starknet (and most blockchains), role-based access control is fully public:

```cairo
// Standard approach — leaks who your privileged users are
mapping(ContractAddress => bool) is_admin;

fn sensitive_action() {
    assert(is_admin[get_caller_address()], 'Not authorized');
}
```

Anyone can scan the chain and see the complete list of privileged wallets. In DAOs, DeFi whitelists, private voting, healthcare, and legal applications — **the membership list itself is sensitive data**.

---

## The Solution

**AccessManager ZK** replaces address whitelists with a single Merkle root and on-chain ZK proof verification.

Instead of storing `wallet → role`, you store only a **root hash** of an off-chain Merkle tree. Users prove they belong to the tree using a **Noir ZK circuit**, without revealing which leaf (identity) they occupy.

```
User holds:  secret key
         ↓
Noir circuit proves:
  1. hash(secret) is a leaf in the Merkle tree
  2. nullifier = hash(secret, action_hash)  ← binds proof to one action
         ↓
On-chain:  verify proof → check nullifier unused → execute action
```

**Result:** Anonymous, replay-proof, role-based access control with zero on-chain identity exposure.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN                             │
│  User secret → Poseidon hash → Merkle Leaf                   │
│  Noir Circuit generates: proof + nullifier + public_inputs   │
└────────────────────────┬─────────────────────────────────────┘
                         │ transaction
┌────────────────────────▼─────────────────────────────────────┐
│                        ON-CHAIN (Starknet)                   │
│                                                              │
│  ProtectedTreasury / Any DApp                                │
│       │ calls consume(role_id, proof, public_inputs)         │
│       ▼                                                      │
│  AccessManagerZK                                             │
│       │ 1. Check root matches role                           │
│       │ 2. Check nullifier not used                          │
│       │ 3. Verify proof via Verifier contract                │
│       │ 4. Mark nullifier used                               │
│       ▼                                                      │
│  Verifier (MockVerifier for demo / Groth16 for production)   │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
accessmanager-zk/
├── circuits/                     # Noir ZK circuit
│   ├── src/main.nr               # Merkle membership + nullifier proof
│   ├── Nargo.toml
│   └── Prover.toml
├── contracts/                    # Cairo smart contracts
│   ├── src/
│   │   ├── interfaces.cairo      # IAccessManagerZK, IVerifier, IProtectedTreasury
│   │   ├── access_manager.cairo  # Core protocol contract
│   │   ├── verifier.cairo        # Groth16 verifier stub (production path)
│   │   ├── mock_verifier.cairo   # MockVerifier for demo/testing
│   │   ├── protected_treasury.cairo  # Example DApp integration
│   │   ├── tests.cairo           # AccessManagerZK unit tests
│   │   └── tests_treasury.cairo  # ProtectedTreasury unit tests
│   └── Scarb.toml
├── demo/
│   ├── index.js                  # End-to-end demo script
│   ├── generate_proof.ts         # Off-chain proof generation (Noir JS)
│   ├── .env                      # RPC + account config
│   └── package.json
├── docs/
│   ├── architecture.md           # Detailed flow diagrams
│   ├── integration.md            # How to integrate into your contract
│   └── threat-model.md           # Security analysis
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| `scarb` | ≥ 2.9.x | [docs.swmansion.com/scarb](https://docs.swmansion.com/scarb/download) |
| `snforge` | ≥ 0.35.x | [foundry-rs.github.io/starknet-foundry](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html) |
| `nargo` | ≥ 0.36.x | [noir-lang.org](https://noir-lang.org/docs/getting_started/installation) |
| `starknet-devnet` | ≥ 0.7.x | `pip install starknet-devnet` |
| `node` | ≥ 18 | [nodejs.org](https://nodejs.org) |

---

### 1. Clone & Install

```bash
git clone <repo-url>
cd accessmanager-zk

# Install demo dependencies
cd demo && npm install && cd ..
```

---

### 2. Build Contracts

```bash
cd contracts
scarb build
```

Artifacts appear in `contracts/target/dev/`.

---

Expected: **18 tests passed, 0 failed**

```
[PASS] tests::test_constructor
[PASS] tests::test_set_role_root
[PASS] tests::test_consume_valid_proof
[PASS] tests::test_consume_invalid_root
[PASS] tests::test_consume_invalid_action
[PASS] tests::test_consume_replay
[PASS] tests_treasury::test_treasury_deployment
[PASS] tests_treasury::test_treasury_deposit
[PASS] tests_treasury::test_treasury_multi_deposit
... (18 total)
```

---

### 4. Run the Circuit Tests (Noir)

```bash
cd circuits
nargo test
```

---

### 5. Run the End-to-End Demo

**Terminal 1 — Start local devnet:**

```bash
starknet-devnet --seed 42 --accounts 1
```

Copy the printed account address and private key. They are pre-configured in `demo/.env` for seed 42.

**Terminal 2 — Run the demo:**

```bash
cd demo
node index.js
```

**What the demo does:**

1. ✅ Connects to pre-deployed account on local devnet
2. ✅ Deploys `MockVerifier` contract
3. ✅ Deploys `AccessManagerZK` contract (configured with MockVerifier)
4. ✅ Deploys `ProtectedTreasury` DApp (configured with AccessManagerZK)
5. ✅ Treasury owner registers a Merkle root of authorized users
6. ✅ User submits simulated ZK proof → successfully withdraws 500 tokens
7. ✅ Replay attack: same proof submitted again → **reverts** (nullifier already used)

**Expected output:**
```
🚀 Starting StarkAccess ZK Protocol Demo...
✅ Connected to account: 0x034ba...
✅ MockVerifier deployed at: 0x...
✅ AccessManagerZK deployed at: 0x...
✅ ProtectedTreasury deployed at: 0x...
✅ Setup Transaction Confirmed!
💰 Treasury Balance Before: 10000
✅ Withdrawal Successful!
💰 Treasury Balance After: 9500
✅ Expected Failure: Nullifier already used — replay attack blocked!
🎉 Demo complete!
```

---

## Deploying to Starknet Testnet (Sepolia)

1. **Configure `.env`** in `demo/`:
   ```bash
   RPC_URL=https://starknet-sepolia.public.blastapi.io
   ACCOUNT_ADDRESS=0xYOUR_SEPOLIA_ACCOUNT
   PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ```

2. **Fund your account** with Sepolia ETH from the [Starknet faucet](https://faucet.starknet.io)

3. **Run the demo** — same command, it will deploy to Sepolia:
   ```bash
   cd demo && node index.js
   ```

---

## How to Integrate Into Your Contract

See [`docs/integration.md`](./docs/integration.md) for the full guide. The short version:

```cairo
// 1. Store the AccessManagerZK address
#[storage]
struct Storage {
    access_manager: ContractAddress,
}

// 2. Protect any function
fn my_protected_action(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>
) {
    let manager = IAccessManagerZKDispatcher {
        contract_address: self.access_manager.read()
    };
    // This reverts if proof is invalid or nullifier is already used
    manager.consume(get_contract_address().into(), 999, proof, public_inputs);

    // ... your sensitive logic here
}
```

---

## Security

| Threat | Mitigation |
|--------|-----------|
| Identity leakage | No wallet addresses stored — only a Merkle root |
| Replay attacks | Nullifiers tracked on-chain; each proof usable exactly once |
| Cross-action replay | `nullifier = hash(secret, action_hash)` binds proof to specific action |
| Invalid proofs | On-chain verifier rejects proofs with wrong public inputs |

Full details: [`docs/threat-model.md`](./docs/threat-model.md)

---

## Production Path (Real Verifier)

The demo uses `MockVerifier` which accepts any non-empty proof. For production:

```bash
# 1. Generate the Cairo verifier from your compiled circuit
cd circuits
nargo codegen-verifier

# 2. Replace contracts/src/verifier.cairo with the generated output
# 3. Redeploy with the real Groth16Verifier instead of MockVerifier
```

---

## Use Cases

| Application | Benefit |
|------------|---------|
| DAO Treasury | Anonymous multi-sig authorization — no signer list exposed |
| DeFi Whitelist | Prove KYC/accreditation without revealing wallet address |
| Private Voting | Anonymous eligibility — voter set is private |
| Access Control | Role membership hidden from attackers and competitors |

---

## Tech Stack

- **ZK Circuit:** Noir (Barretenberg backend, Honk/Groth16)
- **Smart Contracts:** Cairo 2 / Starknet
- **Build Tools:** Scarb, Starknet Foundry (snforge)
- **Demo:** Node.js + starknet.js v9

---

## License

MIT
