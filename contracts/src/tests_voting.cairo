use core::option::OptionTrait;
use core::traits::{Into, TryInto};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, SyscallResultTrait};
use super::interfaces::{
    IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait, IPrivateVotingDispatcher,
    IPrivateVotingDispatcherTrait,
};

fn deploy_mock_verifier() -> ContractAddress {
    let contract = declare("MockVerifier").unwrap_syscall().contract_class();
    let (addr, _) = contract.deploy(@array![]).unwrap_syscall();
    addr
}

fn deploy_access_manager(verifier: ContractAddress, owner: ContractAddress) -> ContractAddress {
    let contract = declare("AccessManagerZK").unwrap_syscall().contract_class();
    let calldata = array![verifier.into(), owner.into()];
    let (addr, _) = contract.deploy(@calldata).unwrap_syscall();
    addr
}

fn deploy_voting(manager: ContractAddress, owner: ContractAddress) -> ContractAddress {
    let contract = declare("PrivateVoting").unwrap_syscall().contract_class();
    let calldata = array![manager.into(), owner.into()];
    let (addr, _) = contract.deploy(@calldata).unwrap_syscall();
    addr
}

fn full_setup() -> (ContractAddress, IPrivateVotingDispatcher, IAccessManagerZKDispatcher) {
    let owner: ContractAddress = 0xABCD.try_into().unwrap();
    let verifier = deploy_mock_verifier();
    let manager = deploy_access_manager(verifier, owner);
    let voting = deploy_voting(manager, owner);

    let v = IPrivateVotingDispatcher { contract_address: voting };
    let m = IAccessManagerZKDispatcher { contract_address: manager };
    (owner, v, m)
}

#[test]
fn test_voting_deployment() {
    let (_, v, _) = full_setup();
    assert(v.get_proposal_count() == 0, 'Initial count wrong');
}

#[test]
fn test_create_proposal() {
    let (owner, v, _) = full_setup();
    start_cheat_caller_address(v.contract_address, owner);
    v.create_proposal('Test Proposal');
    stop_cheat_caller_address(v.contract_address);
    assert(v.get_proposal_count() == 1, 'Proposal not created');
}

#[test]
fn test_cast_vote_anonymous() {
    let (owner, v, _) = full_setup();
    let root: felt252 = 0x12345678;
    
    // Set role root for the voting contract
    start_cheat_caller_address(v.contract_address, owner);
    v.setup_role_root(root);
    v.create_proposal('Proposal 1');
    stop_cheat_caller_address(v.contract_address);

    let proposal_id: felt252 = 1;
    let nullifier: felt252 = 0xFEED;
    let proof = array![1_felt252].span(); // Mock proof works
    let public_inputs = array![root, proposal_id, nullifier].span();

    // Vote Yes
    v.cast_vote(proposal_id, true, proof, public_inputs);

    let (yes, no) = v.get_results(proposal_id);
    assert(yes == 1, 'Yes vote count wrong');
    assert(no == 0, 'No vote count wrong');
}

#[test]
#[should_panic(expected: ('Nullifier already used',))]
fn test_double_vote_reverts() {
    let (owner, v, _) = full_setup();
    let root: felt252 = 0x12345678;
    
    start_cheat_caller_address(v.contract_address, owner);
    v.setup_role_root(root);
    v.create_proposal('Proposal 1');
    stop_cheat_caller_address(v.contract_address);

    let proposal_id: felt252 = 1;
    let nullifier: felt252 = 0xFEED;
    let proof = array![1_felt252].span();
    let public_inputs = array![root, proposal_id, nullifier].span();

    // First vote
    v.cast_vote(proposal_id, true, proof, public_inputs);

    // Second vote with same nullifier (identity) for SAME proposal
    v.cast_vote(proposal_id, false, proof, public_inputs);
}

#[test]
fn test_different_proposals_different_nullifiers() {
    let (owner, v, _) = full_setup();
    let root: felt252 = 0x12345678;
    
    start_cheat_caller_address(v.contract_address, owner);
    v.setup_role_root(root);
    v.create_proposal('Proposal 1');
    v.create_proposal('Proposal 2');
    stop_cheat_caller_address(v.contract_address);

    // Vote on Proposal 1
    v.cast_vote(1, true, array![1].span(), array![root, 1, 0x1111].span());
    
    // Vote on Proposal 2 (different nullifier for different action)
    v.cast_vote(2, true, array![1].span(), array![root, 2, 0x2222].span());

    let (yes1, _) = v.get_results(1);
    let (yes2, _) = v.get_results(2);
    assert(yes1 == 1, 'P1 vote failed');
    assert(yes2 == 1, 'P2 vote failed');
}
