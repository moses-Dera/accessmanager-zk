import { Contract } from 'starknet';

/**
 * StarkAccessClient provides high-level interactions with the AccessManagerZK contract.
 */
export class StarkAccessClient {
    /**
     * @param {string} contractAddress - Address of the AccessManagerZK contract.
     * @param {Object} account - Starknet.js Account instance.
     * @param {Array} [abi] - Optional ABI array.
     */
    constructor(contractAddress, account) {
        this.contractAddress = contractAddress;
        this.account = account;
    }

    /**
     * Registers a new Merkle Root (Role) on-chain.
     * @param {bigint} root 
     */
    async registerRole(root) {
        return await this.account.execute({
            contractAddress: this.contractAddress,
            entrypoint: 'setup_role_root',
            calldata: [root.toString()]
        }, undefined, { version: 1, maxFee: 1e15 });
    }

    /**
     * Checks if a nullifier has already been consumed.
     * @param {bigint} nullifier 
     */
    async isUsed(nullifier) {
        const response = await this.account.callContract({
            contractAddress: this.contractAddress,
            entrypoint: 'is_nullifier_used',
            calldata: [nullifier.toString()]
        });
        // Starknet response is an array of felts. Boolean(0x1) or Boolean(0x0)
        return response[0] === '0x1';
    }
}
