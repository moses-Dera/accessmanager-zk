import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

export async function generateZKProofFromCircuit(circuitDef, inputs) {
    console.log("Initializing Barretenberg backend...");
    const backend = new BarretenbergBackend(circuitDef);
    const noir = new Noir(circuitDef);

    console.log("Generating proof and witness...");
    const { witness } = await noir.execute(inputs);
    const proof = await backend.generateProof(witness);

    // Format proof for Starknet (Span<felt252>)
    // Noir proof is Uint8Array, we need to convert to felts if needed, 
    // but usually we just send the bytes or chunks. 
    // In our contracts, it expects Span<felt252>.

    return {
        proof: proof.proof,
        publicInputs: proof.publicInputs
    };
}

// Make it available globally in the browser
window.generateZKProofFromCircuit = generateZKProofFromCircuit;
