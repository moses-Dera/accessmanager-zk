import { Contract } from 'starknet';

/**
 * StarkAccessClient provides high-level interactions with the AccessManagerZK contract.
 */
export class StarkAccessClient {
    /**
     * @param {string} contractAddress - Address of the AccessManagerZK contract.
     * @param {Object} account - Starknet.js Account instance.
     */
    constructor(contractAddress, account) {
        this.contractAddress = contractAddress;
        this.account = account;
        // ABI for AccessManagerZK (Flat version for simplicity and compatibility)
        this.abi = [
            {
                "name": "setup_role_root",
                "type": "function",
                "inputs": [{ "name": "new_root", "type": "felt" }],
                "outputs": []
            },
            {
                "name": "consume",
                "type": "function",
                "inputs": [
                    { "name": "role_id", "type": "felt" },
                    { "name": "action", "type": "felt" },
                    { "name": "proof", "type": "felt*" },
                    { "name": "public_inputs", "type": "felt*" }
                ],
                "outputs": []
            },
            {
                "name": "is_nullifier_used",
                "type": "function",
                "inputs": [{ "name": "nullifier", "type": "felt" }],
                "outputs": [{ "name": "used", "type": "bool" }]
            }
        ];
        this.contract = new Contract(this.abi, this.contractAddress, this.account);
    }

    /**
     * Registers a new Merkle Root (Role) on-chain.
     * @param {bigint} root 
     */
    async registerRole(root) {
        return await this.contract.setup_role_root(root);
    }

    /**
     * Checks if a nullifier has already been consumed.
     * @param {bigint} nullifier 
     */
    async isUsed(nullifier) {
        return await this.contract.is_nullifier_used(nullifier);
    }
}
