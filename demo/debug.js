console.log('1. Starting debug script');
import 'dotenv/config';
console.log('2. Dotenv loaded');
import { RpcProvider, Account, Contract, CallData } from 'starknet';
console.log('3. Starknet loaded');
import { Identity, MerkleTree, StarkAccessProver, StarkAccessClient } from 'starkaccess-sdk';
console.log('4. SDK loaded');

async function test() {
    console.log('5. Inside test function');
}

test();
