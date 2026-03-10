# Sepolia Deployment Guide

Follow these steps to deploy the AccessManager ZK protocol and the Voting DApp to Starknet Sepolia.

## Prerequisites
- A Starknet Sepolia account with some ETH (use a faucet).
- Your Private Key and Account Address.

## 1. Setup Environment
Navigate to the `demo/` directory and create/edit the `.env` file:

```bash
RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
ACCOUNT_ADDRESS=your_sepolia_address
PRIVATE_KEY=your_private_key
```

## 2. Deploy via Script
The demo script has been updated to support production deployments.

```bash
cd demo
npm install
node index.js
```

## 3. Verify on Explorer
Once the addresses are logged, you can view them on [StarkScan](https://sepolia.starkscan.co/).

## 4. Update Frontend
Copy the new contract addresses into `frontend/index.html` constants:

- `TREASURY_ADDR`
- `ACCESS_MANAGER_ADDR`
- `VOTING_ADDR`
