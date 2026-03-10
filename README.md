# 🔐 StarkAccess Protocol — Zero-Knowledge Authorization for Starknet

> **🚀 Starknet Ecosystem Hackathon Submission | Privacy & Security Track**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/starkaccess-sdk.svg?style=flat&color=success)](https://www.npmjs.com/package/starkaccess-sdk)
[![Live Demo](https://img.shields.io/badge/Live-Demo-4f9eff?style=flat&logo=vercel)](https://frontend-three-umber-41.vercel.app/)

**StarkAccess** is the ultimate decentralized identity and access control protocol. It brings the seamless experience of *"Sign in with Google"* to Web3, but completely autonomous, anonymous, and powered by cutting-edge Zero-Knowledge cryptography.

Forget public whitelists. Stop exposing your users' wallets. Welcome to the era of Zero-Knowledge Access Control on Starknet.

---

## 🌟 The Problem We Are Solving

On Starknet (and every major blockchain), role-based access control is fully public:

```cairo
// ❌ The Standard Approach — Leaks the identities of every privileged user!
mapping(ContractAddress => bool) is_admin;

fn sensitive_action() {
    assert(is_admin[get_caller_address()], 'Not authorized');
}
```

Anyone can scan the chain and instantly extract your complete list of DAO members, private investors, or healthcare participants. In a world moving towards privacy-first decentralized applications — **the membership list itself is highly sensitive data.**

---

## 🔥 The Solution: StarkAccess ZK

**StarkAccess** obliterates token-gated address lists by replacing them with a single **Merkle Root** and on-chain ZK verification.

Instead of storing `wallet => role` on the blockchain, you securely track an off-chain Merkle tree of Poseidon hashes. Users prove they belong to the authorized group locally in their browser using a **Noir ZK circuit**, without ever revealing *which specific leaf* (identity) they occupy!

### How It Works:
1. **The Secret:** The user holds a cryptographic secret key.
2. **The Proof:** Our Noir circuit generates a proof entirely locally stating:
   - *“I know a secret whose hash is a leaf in the current Merkle tree.”*
   - *“Here is a unique, mathematical Nullifier tied to this specific action.”*
3. **The Verification:** The user submits this anonymous payload to your Smart Contract. The AccessManagerZK verifies the SNARK and records the Nullifier to instantly prevent replay attacks and double-voting.

**Result:** 100% Anonymous, Sybil-Resistant, Replay-Proof access control with ZERO on-chain identity exposure.

---

## 🌐 Try It Live! (Interactive Web Demo)

Experience the magic of seamless ZK proving natively in your browser. Our demo connects directly to the Starknet Sepolia testnet. Generate real Noir Zero-Knowledge proofs without installing any software!

👉 **[Launch the Live Vercel Demo](https://frontend-three-umber-41.vercel.app/)**

*(No build required, the ZK Prover is pre-bundled and highly optimized).*

---

## �� Core Highlight: The StarkAccess SDK

We aren't just shipping contracts—we are shipping developer tools. The official JavaScript/TypeScript SDK is published on NPM. It abstracts away all complex cryptography, allowing you to manage Zero-Knowledge Identities and generate proofs locally in your frontend or Node.js backend with just a few lines of code!

### Installation

```bash
npm install starkaccess-sdk
```

### Usage in 4 Simple Steps

```javascript
import { Identity, MerkleTree, StarkAccessProver } from 'starkaccess-sdk';
import circuitJson from './circuit.json';

// 1. Create your digital identity (Keep this secret!)
const identity = new Identity('my-secret-string');
const leaf = identity.getLeaf();

// 2. Build the authorized group (Merkle Tree)
const tree = new MerkleTree([leaf, otherLeaf1, otherLeaf2], 4);

// 3. Generate a Zero-Knowledge Proof locally (in-browser or Node!)
const proofPayload = await StarkAccessProver.generateProof(
  identity,
  tree,
  0,                  // Your index in the tree
  'vote_proposal_1',  // The specific action you are taking
  circuitJson
);

// 4. Submit to Cairo!
// proofPayload contains: proof bytes, publicInputs, root, and nullifier
// Submit this directly to your Starknet Smart Contract's protected function!
```

---

## 🏗️ Architecture Deep Dive

```
┌──────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN                             │
│  User secret → Bn254 Poseidon hash → Merkle Leaf             │
│  Noir Circuit generates: proof + nullifier + public_inputs   │
└────────────────────────┬─────────────────────────────────────┘
                         │ anonymous transaction
┌────────────────────────▼─────────────────────────────────────┐
│                        ON-CHAIN (Starknet)                   │
│                                                              │
│  ProtectedTreasury / Any DApp                                │
│       │ calls consume(role_id, proof, public_inputs)         │
│       ▼                                                      │
│  AccessManagerZK (The protocol dispatcher)                   │
│       │ 1. Validate the Merkle Root matches the role         │
│       │ 2. Ensure the Nullifier is unused (sybil resistance) │
│       │ 3. Verify ZK proof via Verifier contract             │
│       │ 4. Permanently mark Nullifier as spent               │
│       ▼                                                      │
│  Verifier (Groth16 / UltraHonk backing)                      │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚡ Use Cases

What can you build with StarkAccess?

| Industry | Application & Benefit |
|----------|-----------------------|
| **DAO Governance** | **Private Voting**: Establish anonymous eligibility. The voter set is perfectly private, preventing bribery and social coercion. |
| **DeFi & RWA** | **KYC Whitelists**: Prove accreditation or KYC status to interact with a protocol without linking your real-world identity to your wallet address. |
| **Treasuries** | **Anonymous Multi-Sigs**: Authorize large capital deployments without exposing the list of signers to attackers or competitors. |
| **Web3 Gaming** | **Sybil Resistance**: Airdrop claiming and tournament gating where players prove unique humanity without revealing their primary vaults. |

---

## 🛠️ The Tech Stack

We heavily leveraged the Starknet ecosystem tools to build this unified protocol:

- **Smart Contracts:** Cairo 2 / Starknet natively integrated with **OpenZeppelin (Cairo)** standard components (Ownable, ERC20) for battle-tested security.
- **ZK Circuit:** Noir (Barretenberg backend, Honk/Groth16 proving systems). We specifically optimized for Bn254 Poseidon hashing.
- **Client & Tooling:** Node.js, Next/Vercel, `starknet.js` v9, and `starkaccess-sdk`.
- **Build Infrastructure:** Scarb, Starknet Foundry (`snforge`).

---

## 🚀 Quick Start (Local Development)

Want to run the entire protocol locally? It takes less than 2 minutes.

### Prerequisites
- `scarb` (≥ 2.9.x)
- `snforge` (≥ 0.35.x)
- `nargo` (≥ 0.36.x)
- `starknet-devnet` (≥ 0.7.x)
- `node` (≥ 18)

### 1. Clone & Build
```bash
git clone https://github.com/moses-Dera/accessmanager-zk.git
cd accessmanager-zk

# Build Cairo contracts
cd contracts && scarb build && cd ..

# Install demo dependencies
cd demo && npm install && cd ..
```

### 2. Test the Framework
Run the comprehensive smart contract test suite (23 tests verifying verification, replay attacks, logic execution, and invalid proofs):
```bash
cd contracts && snforge test
```

### 3. Run the End-to-End Demo
Start your local blockchain:
```bash
starknet-devnet --seed 42 --accounts 1
```

In a new terminal, run the E2E deploy and proof execution script:
```bash
cd demo && node index.js
```
*The script configures the treasury, registers the Merkle root, generates a live ZK proof in Node, and successfully withdraws funds—while testing and blocking replay attacks!*

---

## 🛡️ Integration Guide

Integrating StarkAccess into your own Cairo smart contract is trivially easy. See the full tutorial in [`docs/integration.md`](./docs/integration.md).

```cairo
// 1. Store the AccessManagerZK address
#[storage]
struct Storage {
    access_manager: ContractAddress,
}

// 2. Protect any function!
fn my_protected_action(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>
) {
    let manager = IAccessManagerZKDispatcher {
        contract_address: self.access_manager.read()
    };
    
    // This reverts the transaction instantly if the proof is invalid 
    // or if the nullifier has already been used!
    manager.consume(get_contract_address().into(), 'unique_action_id', proof, public_inputs);

    // ... ✅ Your sensitive logic executes safely here ...
}
```

---

## 📂 Documentation & Deployments

- **Sepolia Contract Addresses:** Live deployments on the Testnet are tracked in [`docs/deployments.md`](./docs/deployments.md)
- **Security & Threat Model:** Comprehensive analysis of identity leakage and replay defense in [`docs/threat-model.md`](./docs/threat-model.md)

---

## 📜 License

MIT License - Built for the Starknet community.
