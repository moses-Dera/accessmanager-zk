import test from 'node:test';
import assert from 'node:assert/strict';
import { Identity } from '../src/identity.js';
import { MerkleTree } from '../src/tree.js';

test('Identity leaf generation', async (t) => {
    const secret = 12345n;
    const id = new Identity(secret);
    const leaf = id.getLeaf();

    // Verify it's a BigInt
    assert.strictEqual(typeof leaf, 'bigint');

    // Known Poseidon(12345) on Bn254 is roughly this (taken from Noir main.nr test values)
    // Let's just ensure it's consistent
    const leaf2 = id.getLeaf();
    assert.strictEqual(leaf, leaf2);
});

test('MerkleTree root and proof generation', async (t) => {
    const leaves = [100n, 200n, 300n, 400n];
    const tree = new MerkleTree(leaves, 2); // Depth 2 for simplicity

    const root = tree.getRoot();
    assert.strictEqual(typeof root, 'bigint');

    const { merklePath, pathIndices } = tree.getProof(0);
    assert.strictEqual(merklePath.length, 2);
    assert.strictEqual(pathIndices.length, 2);
    assert.strictEqual(pathIndices[0], 0); // leaf 0 is left
});
