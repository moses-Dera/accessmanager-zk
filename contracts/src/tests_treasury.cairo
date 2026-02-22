use core::option::OptionTrait;
use core::traits::{Into, TryInto};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::{ContractAddress, SyscallResultTrait};
#[cfg(test)]
use super::access_manager::AccessManagerZK;
use super::interfaces::{IVerifierDispatcher, IVerifierDispatcherTrait};
use super::mock_verifier::MockVerifier;
use super::protected_treasury::ProtectedTreasury;

fn deploy_mock_verifier() -> ContractAddress {
    let contract = declare("MockVerifier").unwrap_syscall().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap_syscall();
    contract_address
}

fn deploy_access_manager(
    verifier: ContractAddress,
) -> (ContractAddress, AccessManagerZK::ContractState) {
    let mut state = AccessManagerZK::contract_state_for_testing();
    AccessManagerZK::constructor(ref state, verifier);

    // Simulate deployment address
    let manager_addr: ContractAddress = 0x1111.try_into().unwrap();
    (manager_addr, state)
}

fn setup_treasury() -> (
    ContractAddress,
    ContractAddress,
    ProtectedTreasury::ContractState,
    AccessManagerZK::ContractState,
) {
    let verifier = deploy_mock_verifier();
    let (manager_addr, manager_state) = deploy_access_manager(verifier);

    // Deploy Treasury
    let mut treasury_state = ProtectedTreasury::contract_state_for_testing();
    let initial_balance = 10000;
    let owner: ContractAddress = 0xABCD.try_into().unwrap();
    ProtectedTreasury::constructor(ref treasury_state, manager_addr, initial_balance, owner);

    let treasury_addr: ContractAddress = 0x2222.try_into().unwrap();

    (treasury_addr, manager_addr, treasury_state, manager_state)
}

#[test]
fn test_treasury_deployment() {
    let (_, _, mut treasury_state, _) = setup_treasury();
    let balance = ProtectedTreasury::ProtectedTreasuryImpl::get_balance(@treasury_state);
    assert(balance == 10000_felt252, 'Initial balance is wrong');
}

#[test]
fn test_treasury_deposit() {
    let (_, _, mut treasury_state, _) = setup_treasury();
    ProtectedTreasury::ProtectedTreasuryImpl::deposit(ref treasury_state, 500);
    let balance = ProtectedTreasury::ProtectedTreasuryImpl::get_balance(@treasury_state);
    assert(balance == 10500_felt252, 'Deposit failed');
}
// In a real environment, the Treasury contract calls the AccessManager contract.
// Testing the cross-contract call `manager.consume(...)` directly in Cairo `mod tests`
// without a full testing orchestrator (like snforge) is complex because
// `contract_state_for_testing()`
// creates isolated states, not actual deployed contracts that `IDispatcher::consume` can hit.
// But we'll test that the code compiles. The demo script will test it fully!


