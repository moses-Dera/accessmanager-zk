use core::option::OptionTrait;
use core::traits::{Into, TryInto};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::testing::{set_caller_address, set_contract_address};
use starknet::{ContractAddress, SyscallResultTrait};
#[cfg(test)]
use super::access_manager::AccessManagerZK;
use super::interfaces::{IVerifierDispatcher, IVerifierDispatcherTrait};
use super::mock_verifier::MockVerifier;

fn deploy_mock_verifier() -> ContractAddress {
    let contract = declare("MockVerifier").unwrap_syscall().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap_syscall();
    contract_address
}

fn setup() -> (ContractAddress, AccessManagerZK::ContractState) {
    let verifier = deploy_mock_verifier();
    let mut state = AccessManagerZK::contract_state_for_testing();
    AccessManagerZK::constructor(ref state, verifier);
    (verifier, state)
}

#[test]
fn test_set_role_root() {
    let (_verifier, mut state) = setup();
    let caller: ContractAddress = 0x1234.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(caller);

    let role_id: felt252 = caller.into();
    let root: felt252 = 0x12345678;

    AccessManagerZK::AccessManagerZKImpl::set_role_root(ref state, root);

    let stored_root = AccessManagerZK::AccessManagerZKImpl::get_role_root(@state, role_id);
    assert(stored_root == root, 'Root not set correctly');
}

#[test]
fn test_constructor() {
    let (verifier, state) = setup();
    let stored_addr = AccessManagerZK::AccessManagerZKImpl::get_verifier_address(@state);
    assert(stored_addr == verifier, 'Verifier not set correctly');
}

#[test]
fn test_consume_valid_proof() {
    let (_, mut state) = setup();

    let caller: ContractAddress = 0x1234.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(caller);
    let role_id: felt252 = caller.into();

    let root = 100;
    AccessManagerZK::AccessManagerZKImpl::set_role_root(ref state, root);

    // 3. Prepare Inputs
    let action_hash = 999;
    let nullifier = 555;
    let public_inputs = array![root, action_hash, nullifier].span();
    let proof = array![1].span(); // Non-empty proof

    // Set caller to someone else to prove anyone can consume a proof for a role
    let random_caller: ContractAddress = 0x9999.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(random_caller);

    // 4. Consume
    AccessManagerZK::AccessManagerZKImpl::consume(
        ref state, role_id, action_hash, proof, public_inputs,
    );
}

#[test]
#[should_panic(expected: ('Action hash mismatch',))]
fn test_consume_invalid_action() {
    let (_, mut state) = setup();

    let caller: ContractAddress = 0x1234.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(caller);
    let role_id: felt252 = caller.into();

    let root = 100;
    AccessManagerZK::AccessManagerZKImpl::set_role_root(ref state, root);

    let action_hash = 999;
    let wrong_action = 888;
    let nullifier = 555;
    let public_inputs = array![root, action_hash, nullifier].span();
    let proof = array![1].span();

    AccessManagerZK::AccessManagerZKImpl::consume(
        ref state, role_id, wrong_action, proof, public_inputs,
    );
}

#[test]
#[should_panic(expected: ('Invalid root for role',))]
fn test_consume_invalid_root() {
    let (_, mut state) = setup();

    let caller: ContractAddress = 0x1234.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(caller);
    let role_id: felt252 = caller.into();

    let root = 100;
    AccessManagerZK::AccessManagerZKImpl::set_role_root(ref state, root);

    let wrong_root = 101;
    let action_hash = 999;
    let public_inputs = array![wrong_root, action_hash, 555].span();
    let proof = array![1].span();

    AccessManagerZK::AccessManagerZKImpl::consume(
        ref state, role_id, action_hash, proof, public_inputs,
    );
}

#[test]
#[should_panic(expected: ('Nullifier already used',))]
fn test_consume_replay() {
    let (_, mut state) = setup();

    let caller: ContractAddress = 0x1234.try_into().unwrap();
    snforge_std::start_cheat_caller_address_global(caller);
    let role_id: felt252 = caller.into();

    let root = 100;
    AccessManagerZK::AccessManagerZKImpl::set_role_root(ref state, root);

    let action_hash = 999;
    let public_inputs = array![root, action_hash, 555].span();
    let proof = array![1].span();

    // First Call
    AccessManagerZK::AccessManagerZKImpl::consume(
        ref state, role_id, action_hash, proof, public_inputs,
    );

    // Second Call (Replay)
    AccessManagerZK::AccessManagerZKImpl::consume(
        ref state, role_id, action_hash, proof, public_inputs,
    );
}
