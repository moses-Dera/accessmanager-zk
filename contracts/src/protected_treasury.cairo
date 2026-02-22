#[starknet::contract]
mod ProtectedTreasury {
    use core::traits::Into;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::super::interfaces::{
        IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait, IProtectedTreasury,
    };

    #[storage]
    struct Storage {
        access_manager: ContractAddress,
        balance: felt252,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Deposited: Deposited,
        Withdrawn: Withdrawn,
    }

    #[derive(Drop, starknet::Event)]
    struct Deposited {
        amount: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdrawn {
        amount: felt252,
        to: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        access_manager_addr: ContractAddress,
        initial_balance: felt252,
        owner: ContractAddress,
    ) {
        self.access_manager.write(access_manager_addr);
        self.balance.write(initial_balance);
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl ProtectedTreasuryImpl of IProtectedTreasury<ContractState> {
        // Sets the root of authorized users. Only the treasury owner can do this now.
        fn setup_role_root(ref self: ContractState, root: felt252) {
            let caller = get_caller_address();
            let owner = self.owner.read();
            assert(caller == owner, 'Unauthorized: Not owner');

            let manager = IAccessManagerZKDispatcher {
                contract_address: self.access_manager.read(),
            };
            manager.set_role_root(root);
        }

        fn deposit(ref self: ContractState, amount: felt252) {
            let current = self.balance.read();
            self.balance.write(current + amount);
            self.emit(Event::Deposited(Deposited { amount }));
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

            // 2. Execute Protected Action
            let current = self.balance.read();
            let current_u256: u256 = current.into();
            let amount_u256: u256 = amount.into();
            assert(current_u256 >= amount_u256, 'Insufficient balance');
            self.balance.write(current - amount);

            // In a real ERC20, we would do token.transfer(caller, amount)
            self.emit(Event::Withdrawn(Withdrawn { amount, to: caller }));
        }

        fn get_balance(self: @ContractState) -> felt252 {
            self.balance.read()
        }
    }
}
