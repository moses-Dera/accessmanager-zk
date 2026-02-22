import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import fs from 'fs';
import path from 'path';

async function generateProof() {
    try {
        console.log("Loading circuit artifact...");
        const circuitDef = JSON.parse(fs.readFileSync(path.join(__dirname, "../circuits/target/accessmanager_zk_circuits.json")).toString("utf-8"));

        console.log("Initializing Barretenberg backend...");
        const backend = new BarretenbergBackend(circuitDef);
        const noir = new Noir(circuitDef);

        const secret = "12345";

        console.log("Generating witness...");
        const inputs = {
            root: "0x0000000000000000000000000000000000000000000000000000000000000000", // Will fail assertion but tests witness generation
            action_hash: "111",
            nullifier: "0x00",
            secret: secret,
            merkle_path: ["999", "888", "777", "666"],
            path_indices: [0, 0, 0, 0]
        };

        const { witness } = await noir.execute(inputs);
        console.log("Witness generated successfully!");

        console.log("Generating proof...");
        const proof = await backend.generateProof(witness);
        console.log("Proof generated successfully!", proof.proof.length, "bytes");

    } catch (e) {
        console.error("Proof generation failed:", e);
    }
}

generateProof();
