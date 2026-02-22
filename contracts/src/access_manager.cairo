use starknet::ContractAddress;


#[starknet::contract]
mod AccessManagerZK {
    use core::traits::Into;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use super::super::interfaces::{IAccessManagerZK, IVerifierDispatcher, IVerifierDispatcherTrait};

    #[storage]
    struct Storage {
        role_roots: Map<felt252, felt252>, // role_id (contract address) -> root
        nullifiers: Map<felt252, bool>, // nullifier -> used
        verifier_address: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress) {
        self.verifier_address.write(verifier);
    }

    #[abi(embed_v0)]
    impl AccessManagerZKImpl of IAccessManagerZK<ContractState> {
        fn set_role_root(ref self: ContractState, new_root: felt252) {
            // Decentralized aspect: The caller becomes the role_id.
            // Any DApp contract can call this to set its own authorized users root, acting as its
            // own Admin.
            let caller = get_caller_address();
            let role_id: felt252 = caller.into();
            self.role_roots.write(role_id, new_root);
        }

        fn consume(
            ref self: ContractState,
            role_id: felt252,
            action: felt252,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            // 1. Unpack Public Inputs
            // Expected format: [root, action_hash, nullifier]
            assert(public_inputs.len() == 3, 'Invalid inputs len');
            let input_root = *public_inputs[0];
            let _input_action = *public_inputs[1];
            let input_nullifier = *public_inputs[2];

            // Security fix: explicitly bind the requested action to the proof's action hash to
            // prevent cross-action replay attacks
            assert(_input_action == action, 'Action hash mismatch');

            // 2. Verify Root Matches Role
            let stored_root = self.role_roots.read(role_id);
            assert(input_root == stored_root, 'Invalid root for role');

            // 3. Check Nullifier
            assert(!self.nullifiers.read(input_nullifier), 'Nullifier already used');

            // 4. Verify Proof via External Verifier
            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let is_valid = verifier.verify_proof(proof, public_inputs);
            assert(is_valid, 'Invalid ZK Proof');

            // 5. Mark Nullifier as Used
            self.nullifiers.write(input_nullifier, true);
        }

        fn get_role_root(self: @ContractState, role_id: felt252) -> felt252 {
            self.role_roots.read(role_id)
        }

        fn get_verifier_address(self: @ContractState) -> ContractAddress {
            self.verifier_address.read()
        }
    }
}
