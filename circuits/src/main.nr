use dep::poseidon::poseidon::bn254;

fn main(
    root: pub Field,
    action_hash: pub Field,
    nullifier: pub Field,
    secret: Field,
    merkle_path: [Field; 4],
    path_indices: [u32; 4],
) {
    // 1. Reconstruct Commitment using Poseidon hash
    let commitment = bn254::hash_1([secret]);

    // 2. Verify Membership (Manual Merkle Verification)
    let mut current = commitment;
    for i in 0..4 {
        let sibling = merkle_path[i];
        if path_indices[i] == 0 {
            // Current is left child
            current = bn254::hash_2([current, sibling]);
        } else {
            // Current is right child
            current = bn254::hash_2([sibling, current]);
        }
    }
    assert(current == root);

    // 3. Verify Nullifier
    let computed_nullifier = bn254::hash_2([secret, action_hash]);
    assert(nullifier == computed_nullifier);
}

#[test]
fn test_main() {
    let secret = 12345;
    let commitment = bn254::hash_1([secret]);

    // Simulate a Merkle Tree of depth 4
    // Leaf is at index 0
    let path_indices = [0, 0, 0, 0];

    // Siblings
    let s1 = 999;
    let s2 = 888;
    let s3 = 777;
    let s4 = 666;
    let merkle_path = [s1, s2, s3, s4];

    // Compute expected root manually
    let node1 = bn254::hash_2([commitment, s1]);
    let node2 = bn254::hash_2([node1, s2]);
    let node3 = bn254::hash_2([node2, s3]);
    let root = bn254::hash_2([node3, s4]);

    let action_hash = 111;
    let nullifier = bn254::hash_2([secret, action_hash]);

    main(
        root,
        action_hash,
        nullifier,
        secret,
        merkle_path,
        path_indices,
    );
}
