import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { poseidon2 } from 'poseidon-lite';

/**
 * StarkAccessProver handles ZK proof generation using Noir.
 */
export class StarkAccessProver {
    /**
     * Generates a ZK proof for membership and action.
     * @param {Object} identity - SDK Identity instance.
     * @param {Object} tree - SDK MerkleTree instance.
     * @param {number} leafIndex - Index of the user's leaf in the tree.
     * @param {string|bigint} actionHash - Unique identifier for the action.
     * @param {Object} circuitJson - The Noir circuit artifact.
     * @returns {Promise<{ proof: Uint8Array, publicInputs: bigint[], root: bigint, nullifier: bigint }>}
     */
    static async generateProof(identity, tree, leafIndex, actionHash, circuitJson) {
        const backend = new BarretenbergBackend(circuitJson);
        const noir = new Noir(circuitJson, backend);

        const { merklePath, pathIndices } = tree.getProof(leafIndex);
        const secret = identity.getSecret();
        const actionHashBigInt = typeof actionHash === 'string' ? this.hashString(actionHash) : BigInt(actionHash);

        // Nullifier = Poseidon(secret, actionHash)
        const nullifier = poseidon2([secret, actionHashBigInt]);
        const root = tree.getRoot();

        const inputs = {
            root: root.toString(),
            action_hash: actionHashBigInt.toString(),
            nullifier: nullifier.toString(),
            secret: secret.toString(),
            merkle_path: merklePath.map(p => p.toString()),
            path_indices: pathIndices,
        };

        console.log('⏳ Generating ZK Proof...');
        const { proof, publicInputs } = await noir.generateProof(inputs);

        return {
            proof,
            publicInputs: publicInputs.map(i => BigInt(i)),
            root,
            nullifier
        };
    }

    /**
     * Helper to convert an action string to a field element (BigInt).
     * Simple hash or char code conversion.
     */
    static hashString(str) {
        // Simple numeric conversion for the demo; in production use a proper hash
        let hash = 0n;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 8n) + BigInt(str.charCodeAt(i));
        }
        return hash;
    }
}
