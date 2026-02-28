use core::option::OptionTrait;
use core::traits::{Into, TryInto};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, SyscallResultTrait};
use super::interfaces::{
    IAccessManagerZKDispatcher, IAccessManagerZKDispatcherTrait, IProtectedTreasuryDispatcher,
    IProtectedTreasuryDispatcherTrait, IVerifierDispatcher, IVerifierDispatcherTrait,
};

// ─── Deploy Helpers
// ────────────────────────────────────────────────────────────

fn deploy_mock_verifier() -> ContractAddress {
    let contract = declare("MockVerifier").unwrap_syscall().contract_class();
    let (addr, _) = contract.deploy(@array![]).unwrap_syscall();
    addr
}

fn deploy_access_manager(verifier: ContractAddress) -> ContractAddress {
    let contract = declare("AccessManagerZK").unwrap_syscall().contract_class();
    let calldata = array![verifier.into()];
    let (addr, _) = contract.deploy(@calldata).unwrap_syscall();
    addr
}

fn deploy_treasury(
    manager: ContractAddress, initial_supply: u256, owner: ContractAddress,
) -> ContractAddress {
    let contract = declare("ProtectedTreasury").unwrap_syscall().contract_class();
    let calldata = array![
        manager.into(), initial_supply.low.into(), initial_supply.high.into(), owner.into(),
    ];
    let (addr, _) = contract.deploy(@calldata).unwrap_syscall();
    addr
}

/// Returns (owner_addr, treasury_dispatcher, manager_dispatcher)
fn full_setup() -> (ContractAddress, IProtectedTreasuryDispatcher, IAccessManagerZKDispatcher) {
    let owner: ContractAddress = 0xABCD.try_into().unwrap();
    let verifier = deploy_mock_verifier();
    let manager = deploy_access_manager(verifier);
    let initial_supply: u256 = 10000;
    let treasury = deploy_treasury(manager, initial_supply, owner);

    let t = IProtectedTreasuryDispatcher { contract_address: treasury };
    let m = IAccessManagerZKDispatcher { contract_address: manager };
    (owner, t, m)
}

// ─── Basic Treasury Tests
// ───────────────────────────────────────────────────────

#[test]
fn test_treasury_deployment() {
    let (_, t, _) = full_setup();
    assert(t.get_balance() == 10000, 'Initial balance is wrong');
}

#[test]
fn test_treasury_deposit() {
    let (owner, t, _) = full_setup();
    start_cheat_caller_address(t.contract_address, owner);
    t.deposit(500);
    stop_cheat_caller_address(t.contract_address);
    assert(t.get_balance() == 10500, 'Deposit amount wrong');
}

#[test]
fn test_treasury_multi_deposit() {
    let (owner, t, _) = full_setup();
    start_cheat_caller_address(t.contract_address, owner);
    t.deposit(100);
    t.deposit(200);
    t.deposit(300);
    stop_cheat_caller_address(t.contract_address);
    assert(t.get_balance() == 10600, 'Multi-deposit wrong');
}

// ─── Role Setup
// ─────────────────────────────────────────────────────────────────

#[test]
fn test_setup_role_root_by_owner() {
    let (owner, t, m) = full_setup();
    // The treasury owner sets the role root for the treasury contract
    start_cheat_caller_address(t.contract_address, owner);
    t.setup_role_root(0xDEADBEEF);
    stop_cheat_caller_address(t.contract_address);

    // Verify root was set on the manager (role_id = treasury address)
    let stored_root = m.get_role_root(t.contract_address.into());
    assert(stored_root == 0xDEADBEEF, 'Root not stored correctly');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_setup_role_root_not_owner_reverts() {
    let (_, t, _) = full_setup();
    let random_user: ContractAddress = 0x1234.try_into().unwrap();
    start_cheat_caller_address(t.contract_address, random_user);
    t.setup_role_root(0xBAD);
    stop_cheat_caller_address(t.contract_address);
}

// ─── Full Withdraw Flow (cross-contract)
// ────────────────────────────────────────

/// Helper: set root via owner, then return the root value (treasury addr as role_id)
fn setup_role(owner: ContractAddress, t: IProtectedTreasuryDispatcher, root: felt252) {
    start_cheat_caller_address(t.contract_address, owner);
    t.setup_role_root(root);
    stop_cheat_caller_address(t.contract_address);
}

#[test]
fn test_withdraw_valid_proof() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0xABCDABCD;
    setup_role(owner, t, root);

    let action_hash: felt252 = 999; // matches hardcoded action_hash in ProtectedTreasury
    let nullifier: felt252 = 0x1122334455;
    let proof = array![1_felt252].span();
    let public_inputs = array![root, action_hash, nullifier].span();

    let balance_before = t.get_balance();
    t.withdraw(500, proof, public_inputs);
    let balance_after = t.get_balance();

    assert(balance_before - balance_after == 500, 'Withdraw amount wrong');
}

#[test]
fn test_withdraw_updates_balance_correctly() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0x11111111;
    setup_role(owner, t, root);

    let action_hash: felt252 = 999;
    // Use two different nullifiers for two separate withdrawals
    t.withdraw(100, array![1_felt252].span(), array![root, action_hash, 0x1111].span());
    t.withdraw(200, array![1_felt252].span(), array![root, action_hash, 0x2222].span());

    assert(t.get_balance() == 9700, 'Balance after 2 withdrawals');
}

#[test]
#[should_panic(expected: ('Nullifier already used',))]
fn test_withdraw_replay_attack_reverts() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0xCAFEBABE;
    setup_role(owner, t, root);

    let action_hash: felt252 = 999;
    let nullifier: felt252 = 0xDEAD1234;
    let proof = array![1_felt252].span();
    let public_inputs = array![root, action_hash, nullifier].span();

    // First withdrawal succeeds
    t.withdraw(100, proof, public_inputs);

    // Second with same nullifier must fail
    t.withdraw(100, array![1_felt252].span(), array![root, action_hash, nullifier].span());
}

#[test]
#[should_panic(expected: ('Invalid root for role',))]
fn test_withdraw_wrong_root_reverts() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0xAAAAAAAA;
    setup_role(owner, t, root);

    let wrong_root: felt252 = 0xBBBBBBBB;
    let action_hash: felt252 = 999;
    let proof = array![1_felt252].span();
    // Root in public_inputs doesn't match stored root
    let public_inputs = array![wrong_root, action_hash, 0x9999].span();

    t.withdraw(100, proof, public_inputs);
}

#[test]
#[should_panic(expected: ('Action hash mismatch',))]
fn test_withdraw_wrong_action_hash_reverts() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0x55555555;
    setup_role(owner, t, root);

    let wrong_action: felt252 = 888; // treasury uses 999
    let proof = array![1_felt252].span();
    let public_inputs = array![root, wrong_action, 0x7777].span();

    t.withdraw(100, proof, public_inputs);
}

#[test]
#[should_panic(expected: ('Invalid ZK Proof',))]
fn test_withdraw_empty_proof_reverts() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0x33333333;
    setup_role(owner, t, root);

    let action_hash: felt252 = 999;
    let proof = array![].span(); // Empty proof — MockVerifier rejects
    let public_inputs = array![root, action_hash, 0x4444].span();

    t.withdraw(100, proof, public_inputs);
}

#[test]
#[should_panic(expected: ('ERC20: insufficient balance',))]
fn test_withdraw_insufficient_balance_reverts() {
    let (owner, t, _) = full_setup();
    let root: felt252 = 0x77777777;
    setup_role(owner, t, root);

    let action_hash: felt252 = 999;
    let proof = array![1_felt252].span();
    let public_inputs = array![root, action_hash, 0x8888].span();

    // Try to withdraw more than balance (10000)
    t.withdraw(99999, proof, public_inputs);
}
