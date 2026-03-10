# StarkAccess SDK

The unified developer toolkit for building privacy-preserving applications on Starknet using Zero-Knowledge proofs.

## Installation

```bash
npm install starkaccess-sdk
```

## Quick Start

### 1. Manage Identity
Create an anonymous identity from a secret.
```javascript
import { Identity } from 'starkaccess-sdk';

const identity = new Identity('my-secret-string');
const leaf = identity.getLeaf(); // Register this on-chain
```

### 2. Build Merkle Trees
Organize authorized members into a privacy-preserving Merkle Tree.
```javascript
import { MerkleTree } from 'starkaccess-sdk';

const tree = new MerkleTree([leaf1, leaf2, leaf3], 4);
const root = tree.getRoot();
```

### 3. Generate ZK Proofs
Generate membership proofs locally in the browser or Node.js.
```javascript
import { StarkAccessProver } from 'starkaccess-sdk';

const proofPayload = await StarkAccessProver.generateProof(
  identity,
  tree,
  0, // Index of the user's leaf
  'my_action_name',
  circuitJson
);

// proofPayload contains: proof bytes, publicInputs, root, and nullifier
```

### 4. On-Chain Interaction
Interact with the `AccessManagerZK` contract.
```javascript
import { StarkAccessClient } from 'starkaccess-sdk';

const client = new StarkAccessClient(CONTRACT_ADDR, account);
await client.registerRole(root);
```

## Features
- **Bn254 Poseidon Hashing**: Matches Noir circuit implementation exactly.
- **Noir Integration**: Simplified proof generation via `noir_js`.
- **Starknet Ready**: Built-in wrappers for Starknet.js v9.
- **Browser Compatible**: Lightweight dependencies for seamless frontend integration.
