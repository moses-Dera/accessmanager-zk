use starknet::ContractAddress;

#[starknet::interface]
trait IAccessManagerZK<TContractState> {
    fn consume(
        ref self: TContractState,
        role_id: felt252,
        action: felt252,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
    );
    fn set_role_root(ref self: TContractState, new_root: felt252);
    fn get_role_root(self: @TContractState, role_id: felt252) -> felt252;
    fn get_verifier_address(self: @TContractState) -> ContractAddress;
    fn update_verifier_address(ref self: TContractState, new_verifier: ContractAddress);
}

#[starknet::interface]
trait IVerifier<TContractState> {
    fn verify_proof(
        self: @TContractState, proof: Span<felt252>, public_inputs: Span<felt252>,
    ) -> bool;
}

#[starknet::interface]
trait IProtectedTreasury<TContractState> {
    fn setup_role_root(ref self: TContractState, root: felt252);
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(
        ref self: TContractState,
        amount: u256,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
    );
    fn get_balance(self: @TContractState) -> u256;
}
#[starknet::interface]
trait IPrivateVoting<TContractState> {
    fn create_proposal(ref self: TContractState, description: felt252);
    fn setup_role_root(ref self: TContractState, root: felt252);
    fn cast_vote(
        ref self: TContractState,
        proposal_id: felt252,
        vote: bool,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
    );
    fn get_results(self: @TContractState, proposal_id: felt252) -> (u32, u32);
    fn get_proposal_count(self: @TContractState) -> u32;
}
