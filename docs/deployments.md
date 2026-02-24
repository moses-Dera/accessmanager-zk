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

### Latest Deployment

| Contract | Address | Explorer |
|---|---|---|
| MockVerifier | TBD — run deploy_sepolia.js | — |
| AccessManagerZK | TBD | — |
| ProtectedTreasury | TBD | — |

> **Note:** After first deployment, update the table above with addresses from `deployments.json`.

---

## Mainnet

Not yet deployed. Requires integration of the real Groth16/UltraHonk verifier
(`contracts/src/verifier.cairo`) before mainnet use.
