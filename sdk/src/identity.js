import { poseidon1 } from 'poseidon-lite';

/**
 * Identity manages the user's secret and its derivative on-chain identity (leaf).
 * Uses Bn254 Poseidon hash consistent with the Noir circuit.
 */
export class Identity {
    /**
     * @param {string|bigint} secret - The secret used to generate the identity.
     */
    constructor(secret) {
        this.secret = BigInt(secret);
    }

    /**
     * Returns the Poseidon hash of the secret (Bn254).
     * This matches `bn254::hash_1([secret])` in the Noir circuit.
     * @returns {bigint}
     */
    getLeaf() {
        return poseidon1([this.secret]);
    }

    /**
     * Returns the raw secret.
     * @returns {bigint}
     */
    getSecret() {
        return this.secret;
    }
}
