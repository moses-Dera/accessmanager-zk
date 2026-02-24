# StarkAccess Integration Guide
*How to use StarkAccess Protocol as the "OAuth of Web3"*

StarkAccess is designed to be as easy to integrate as traditional "Sign in with Google" flows, but with the added benefits of complete on-chain anonymity, cryptographic zero-knowledge proofs, and sybil resistance (preventing double actions).

This guide explains how external DAOs, dApps, or any third-party protocols can integrate StarkAccess into their own smart contracts.

---

## 1. The Architecture (Consumer Flow)

Instead of the dApp keeping an internal whitelist of authorized addresses (which sacrifices privacy), the dApp relies on StarkAccess as the **central identity verifier**.

### The Setup (Creating the "Group")
1. The DAO defines their authorized members (e.g., all current NFT holders, or Discord members).
2. They generate a **Merkle Tree** from these members' hidden secrets/addresses off-chain.
3. They register this Merkle Root on central `AccessManagerZK` contract. This creates a new **Role ID**, which is uniquely identified by its Root.

### The DAO's Smart Contract
The DAO developers build their normal smart contracts (e.g., a `DAO_Voting` contract, or an `Airdrop_Claim` contract). 

Instead of maintaining an `allowed_voters` mapping, they simply import the `IAccessManagerDispatcher` and write one line of code to ask StarkAccess if the user is authorized.

**Example Integration (Cairo):**
```rust
#[starknet::interface]
pub trait IAccessManager<TContractState> {
    fn verify_proof_and_consume(
        ref self: TContractState,
        root: felt252,
        action_hash: felt252,
        nullifier_hash: felt252,
        proof: Span<felt252>
    ) -> bool;
}

// Inside the DAO's voting contract:
#[external(v0)]
fn cast_vote(
    ref self: ContractState,
    proof: Span<felt252>,
    root: felt252,
    nullifier: felt252,
    vote_choice: u8
) {
    // 1. Ask StarkAccess to verify the proof!
    // The Access Manager address is stored in the DAO contract.
    let access_manager = IAccessManagerDispatcher { contract_address: self.starkaccess_address.read() };
    
    let action_hash = 'cast_vote'; // A unique action context
    
    // This checks the ZK proof AND prevents double-voting via the nullifier
    let is_valid = access_manager.verify_proof_and_consume(root, action_hash, nullifier, proof);
    
    assert(is_valid, 'UNAUTHORIZED_OR_ALREADY_VOTED');
    
    // 2. If valid, record the anonymous vote
    self.record_vote(vote_choice);
}
```

---

## 2. The Frontend Experience

For the end-user visiting the DAO's website, the flow feels exactly like an OAuth login, but happens entirely locally in their browser:

1. **Prompt**: The DAO frontend prompts the user: *"Prove you are a DAO Member to vote."*
2. **Local Generation**: The user's browser uses the StarkAccess circuit (via `bb.js` or `snarkjs` depending on the proving backend) to generate a ZK Proof using their hidden secret. **The secret never leaves their computer.**
3. **Submission**: The frontend submits the transaction to the `DAO_Voting` contract containing only the Proof, the Target Root, and the Nullifier.
4. **Verification**: The DAO's contract talks to `AccessManagerZK`, verifies the proof, and accepts the vote.

---

## 3. Comparison: OAuth vs StarkAccess

If you are a web2 developer coming to Web3, here's how StarkAccess maps directly to your mental model of OAuth token verification.

| Feature | Web2 OAuth (e.g., Google) | StarkAccess ZK Protocol |
| :--- | :--- | :--- |
| **Identity Provider** | Centralized server (Google) | Decentralized Smart Contract (`AccessManagerZK`) |
| **Token Provided** | JWT Access Token | Cryptographic Zero-Knowledge Proof |
| **Privacy** | The App knows exactly who you are | The App *only* knows you belong to the group (Anonymous) |
| **Sybil Resistance** | Centralized databases / rate limits | Mathematical Nullifiers prevent double-actions/replays |

---

## Summary

By abstracting away the complex cryptography into the `AccessManagerZK` contract, third-party protocols don't need to write their own Noir circuits or understand ZK math. They simply import the Starknet interface, pass the user's proof payload to `verify_proof_and_consume()`, and handle the `true` or `false` result exactly like verifying a typical Web2 API JWT token signature.
