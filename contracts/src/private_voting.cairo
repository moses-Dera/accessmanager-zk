#[starknet::contract]
mod PrivateVoting {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use openzeppelin::access::ownable::OwnableComponent;
    use super::super::interfaces::{
        IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait, IPrivateVoting,
    };

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        access_manager: ContractAddress,
        proposal_count: u32,
        proposals: LegacyMap<u32, felt252>,
        votes_yes: LegacyMap<u32, u32>,
        votes_no: LegacyMap<u32, u32>,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        ProposalCreated: ProposalCreated,
        VoteCast: VoteCast,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalCreated {
        id: u32,
        description: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteCast {
        proposal_id: u32,
        vote: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState, access_manager_addr: ContractAddress, owner: ContractAddress) {
        self.access_manager.write(access_manager_addr);
        self.ownable.initializer(owner);
        self.proposal_count.write(0);
    }

    #[abi(embed_v0)]
    impl PrivateVotingImpl of IPrivateVoting<ContractState> {
        fn create_proposal(ref self: ContractState, description: felt252) {
            self.ownable.assert_only_owner();
            let id = self.proposal_count.read() + 1;
            self.proposals.write(id, description);
            self.proposal_count.write(id);
            self.emit(ProposalCreated { id, description });
        }

        fn setup_role_root(ref self: ContractState, root: felt252) {
            self.ownable.assert_only_owner();
            let manager = IAccessManagerZKDispatcher {
                contract_address: self.access_manager.read(),
            };
            manager.set_role_root(root);
        }

        fn cast_vote(
            ref self: ContractState,
            proposal_id: felt252,
            vote: bool,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            // Verify authorization via AccessManagerZK
            // Passing the proposal_id as the action_hash to prevent double-voting on the same proposal
            let manager = IAccessManagerZKDispatcher {
                contract_address: self.access_manager.read(),
            };
            
            // Note: role_id is the contract address
            manager.consume(
                get_contract_address().into(),
                proposal_id, 
                proof,
                public_inputs
            );

            // Execute vote
            let p_id: u32 = proposal_id.try_into().unwrap();
            if vote {
                let current = self.votes_yes.read(p_id);
                self.votes_yes.write(p_id, current + 1);
            } else {
                let current = self.votes_no.read(p_id);
                self.votes_no.write(p_id, current + 1);
            }

            self.emit(VoteCast { proposal_id: p_id, vote });
        }

        fn get_results(self: @ContractState, proposal_id: felt252) -> (u32, u32) {
            let p_id: u32 = proposal_id.try_into().unwrap();
            (self.votes_yes.read(p_id), self.votes_no.read(p_id))
        }

        fn get_proposal_count(self: @ContractState) -> u32 {
            self.proposal_count.read()
        }
    }
}
