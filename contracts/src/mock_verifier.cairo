use starknet::ContractAddress;

#[starknet::contract]
mod MockVerifier {
    use super::super::interfaces::IVerifier;

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockVerifierImpl of IVerifier<ContractState> {
        fn verify_proof(
            self: @ContractState, proof: Span<felt252>, public_inputs: Span<felt252>,
        ) -> bool {
            // For testing purposes, we assume the proof is valid if it's not empty.
            // In a real verifier, this would check the ZK proof against the verifying key.
            if proof.is_empty() {
                return false;
            }
            true
        }
    }
}
