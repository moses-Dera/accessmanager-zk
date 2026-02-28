#[starknet::contract]
mod ProtectedTreasury {
    use core::traits::Into;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::token::erc20::interface::IERC20;
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::super::interfaces::{
        IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait, IProtectedTreasury,
    };

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
    impl ERC20HooksImpl = ERC20HooksEmptyImpl<ContractState>;

    #[storage]
    struct Storage {
        access_manager: ContractAddress,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        access_manager_addr: ContractAddress,
        initial_supply: u256,
        owner: ContractAddress,
    ) {
        self.access_manager.write(access_manager_addr);
        self.erc20.initializer("StarkAccess Token", "SAT");
        // Mint the initial supply to the treasury itself
        self.erc20.mint(get_contract_address(), initial_supply);
        // Mint some tokens to the owner for testing deposits
        self.erc20.mint(owner, initial_supply);
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl ProtectedTreasuryImpl of IProtectedTreasury<ContractState> {
        // Sets the root of authorized users. Only the treasury owner can do this now.
        fn setup_role_root(ref self: ContractState, root: felt252) {
            self.ownable.assert_only_owner();

            let manager = IAccessManagerZKDispatcher {
                contract_address: self.access_manager.read(),
            };
            manager.set_role_root(root);
        }

        // Anyone can deposit tokens into the treasury
        fn deposit(ref self: ContractState, amount: felt252) {
            let caller = get_caller_address();
            let amount_u256: u256 = amount.into();
            self.erc20._transfer(caller, get_contract_address(), amount_u256);
        }

        // The protected action: Withdrawing funds via a ZK proof
        fn withdraw(
            ref self: ContractState,
            amount: felt252,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            let caller = get_caller_address();
            let action_hash =
                999; // Represents the 'withdraw' action in our circuit specifically for this Treasury

            // 1. Verify Anonymous Authorization via AccessManagerZK
            // Passing the treasury's own address as the role_id, since the treasury owns its own
            // role.
            let manager = IAccessManagerZKDispatcher {
                contract_address: self.access_manager.read(),
            };
            manager
                .consume(
                    get_contract_address().into(),
                    action_hash, // Pass the action we are executing natively
                    proof,
                    public_inputs,
                );

            // 2. Execute Protected Action using standard ERC20 transfer
            let amount_u256: u256 = amount.into();
            self.erc20._transfer(get_contract_address(), caller, amount_u256);
        }

        // Helper to check treasury balance
        fn get_balance(self: @ContractState) -> felt252 {
            let bal: u256 = self.erc20.balance_of(get_contract_address());
            bal.low.into()
        }
    }
}
