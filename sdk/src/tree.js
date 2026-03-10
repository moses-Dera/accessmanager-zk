import { poseidon2 } from 'poseidon-lite';

/**
 * MerkleTree implementation using Bn254 Poseidon hash.
 * Designed to match Noir circuit verification logic.
 */
export class MerkleTree {
    /**
     * @param {bigint[]} leaves - Array of leaf values.
     * @param {number} depth - Depth of the tree (default 4).
     */
    constructor(leaves, depth = 4) {
        this.depth = depth;
        this.leaves = leaves.map(l => BigInt(l));
        this.tree = this.buildTree();
    }

    buildTree() {
        let layers = [this.leaves];
        let currentLayer = this.leaves;

        for (let i = 0; i < this.depth; i++) {
            let nextLayer = [];
            for (let j = 0; j < currentLayer.length; j += 2) {
                let left = currentLayer[j];
                let right = (j + 1 < currentLayer.length) ? currentLayer[j + 1] : 0n; // Zero-padding
                nextLayer.push(poseidon2([left, right]));
            }
            layers.push(nextLayer);
            currentLayer = nextLayer;
        }
        return layers;
    }

    getRoot() {
        return this.tree[this.tree.length - 1][0];
    }

    /**
     * Returns proof for a specific leaf index.
     * @param {number} index
     * @returns {{ merklePath: bigint[], pathIndices: number[] }}
     */
    getProof(index) {
        let merklePath = [];
        let pathIndices = [];
        let currentIndex = index;

        for (let i = 0; i < this.depth; i++) {
            let layer = this.tree[i];
            let siblingIndex = (currentIndex % 2 === 0) ? currentIndex + 1 : currentIndex - 1;

            let sibling = (siblingIndex < layer.length) ? layer[siblingIndex] : 0n;
            merklePath.push(sibling);
            pathIndices.push(currentIndex % 2); // 0 if current is left, 1 if right

            currentIndex = Math.floor(currentIndex / 2);
        }

        return { merklePath, pathIndices };
    }
}
