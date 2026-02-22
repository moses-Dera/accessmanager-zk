# Integration Guide

## Overview

Integrating AccessManager ZK into your Starknet contract takes three steps:
1. Store the `AccessManagerZK` contract address
2. Register your authorized users' Merkle root
3. Add `consume(...)` to your protected functions

---

## Step 1 — Add Storage & Constructor

```cairo
use starknet::ContractAddress;
use your_project::interfaces::{IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait};

#[storage]
struct Storage {
    access_manager: ContractAddress,
    owner: ContractAddress,
}

#[constructor]
fn constructor(
    ref self: ContractState,
    access_manager_addr: ContractAddress,
    owner: ContractAddress,   // Pass explicitly — do NOT use get_caller_address() with UDC
) {
    self.access_manager.write(access_manager_addr);
    self.owner.write(owner);
}
```

> **Note:** Always pass `owner` explicitly in the constructor. If you use `get_caller_address()`, the owner will be set to the **UDC address** during `declareAndDeploy`, not your wallet.

---

## Step 2 — Register Your Merkle Root

Call this once after deployment to register your authorized user set:

```cairo
fn setup_role_root(ref self: ContractState, root: felt252) {
    let caller = get_caller_address();
    assert(caller == self.owner.read(), 'Unauthorized: Not owner');

    // Your contract calls set_role_root — so YOUR contract address becomes the role_id
    let manager = IAccessManagerZKDispatcher {
        contract_address: self.access_manager.read()
    };
    manager.set_role_root(root);
}
```

---

## Step 3 — Protect Your Functions

```cairo
fn my_protected_action(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>,  // [root, action_hash, nullifier]
) {
    let manager = IAccessManagerZKDispatcher {
        contract_address: self.access_manager.read()
    };

    // role_id = this contract's own address
    // action = unique constant identifying this specific function
    manager.consume(
        get_contract_address().into(), // role_id
        999,                           // action_hash (use a unique felt252 per action)
        proof,
        public_inputs,
    );

    // ... your protected logic ...
}
```

The `consume` call will **revert** automatically if:
- Proof is invalid
- Root doesn't match the registered root for the role
- Nullifier has already been used (replay attack)
- Action hash doesn't match the public input

---

## Off-Chain: Generating Proofs

On the client side, use `@noir-lang/noir_js` and `@noir-lang/backend_barretenberg`:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import circuitJson from '../circuits/target/accessmanager_zk_circuits.json';

const backend = new BarretenbergBackend(circuitJson);
const noir = new Noir(circuitJson);

// Inputs
const inputs = {
    root: "0x...",           // Public: current Merkle root for the role
    action_hash: "999",      // Public: must match what the contract expects
    nullifier: "0x...",      // Public: hash(secret, action_hash) — computed below
    secret: "12345",         // Private: user's secret
    merkle_path: ["0x...", "0x...", "0x...", "0x..."],  // Private: sibling hashes
    path_indices: [0, 0, 0, 0]                           // Private: 0=left, 1=right
};

const { witness } = await noir.execute(inputs);
const { proof, publicInputs } = await backend.generateProof(witness);
// proof and publicInputs → pass to your contract's protected function
```

---

## Demo: `demo/generate_proof.ts`

See the included `generate_proof.ts` for a working Noir JS proof generation example.

---

## Deployment Checklist

- [ ] Deploy `MockVerifier` (or real `Groth16Verifier`)
- [ ] Deploy `AccessManagerZK` with verifier address as constructor arg
- [ ] Deploy your DApp contract with `access_manager_addr` + `owner` as constructor args
- [ ] Call `setup_role_root(merkle_root)` from the owner account
- [ ] Distribute `secret` values to authorized users (off-chain)
- [ ] Each authorized user generates a proof client-side and submits transactions
