# StarkAccess Protocol — Deployment Records

This file tracks contract deployments across networks.

## Local Devnet (seed 42)

Run the demo at any time:
```bash
starknet-devnet --seed 42 --accounts 1
cd demo && node index.js
```

Deployed contract addresses are dynamic (re-deployed each run).

---

## Starknet Sepolia Testnet

> Deployments are saved automatically to `deployments.json` when running `scripts/deploy_sepolia.js`.

### How to Deploy

```bash
# 1. Get Sepolia ETH
#    https://faucet.starknet.io  or  https://blastapi.io/public-api/starknet-sepolia

# 2. Configure credentials
cp demo/.env.example demo/.env
# Edit demo/.env and set SEPOLIA_RPC_URL, ACCOUNT_ADDRESS, PRIVATE_KEY

# 3. Build contracts
cd contracts && scarb build && cd ..

# 4. Deploy
cd demo && node ../scripts/deploy_sepolia.js
```

### Latest Deployment (Sepolia)
**Date:** 2026-03-10
**Deployer:** `0x03cf4A18b380...eCf55D`

| Contract | Address | Explorer |
|---|---|---|
| MockVerifier | `0x46fc35838e2fe2976b1ddf7423d6bf2c0c32f696286c3b78f51bcffe7f2dff1` | [Voyager](https://sepolia.voyager.online/contract/0x46fc35838e2fe2976b1ddf7423d6bf2c0c32f696286c3b78f51bcffe7f2dff1) |
| AccessManagerZK | `0x144abdbdbef77fea62aa2fc545e903c3ab3f5bdd95cdd74b167b5526558c019` | [Voyager](https://sepolia.voyager.online/contract/0x144abdbdbef77fea62aa2fc545e903c3ab3f5bdd95cdd74b167b5526558c019) |
| ProtectedTreasury | `0x2916e9f5779b537619b9c5695321fd0c16409234b73714a053f80b239d73540` | [Voyager](https://sepolia.voyager.online/contract/0x2916e9f5779b537619b9c5695321fd0c16409234b73714a053f80b239d73540) |

---

## Mainnet

Not yet deployed. Requires integration of the real Groth16/UltraHonk verifier
(`contracts/src/verifier.cairo`) before mainnet use.
