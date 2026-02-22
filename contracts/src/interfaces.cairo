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
    fn deposit(ref self: TContractState, amount: felt252);
    fn withdraw(
        ref self: TContractState,
        amount: felt252,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
    );
    fn get_balance(self: @TContractState) -> felt252;
}
