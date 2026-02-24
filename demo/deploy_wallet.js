const { RpcProvider, Account, CallData } = require('starknet');

async function deployWallet() {
    console.log('🌐 Connecting to Sepolia...');
    const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/2SbdpIrlUjQIJyWtdStmd' });

    const privateKey = '0x0441c35b76c86d2af21556304b9c70328c267dc4c2a8895d16c0f03789c5a030';
    const address = '0x03cf4a18b3804d42fdaf54fc9886b727779ae4929f2142fd9f72760b85ecf55d';

    // v9 constructor expects an options object
    const account = new Account({ provider, address, signer: privateKey });

    console.log(`\n⏳ Deploying wallet account contract: ${address}`);

    const payload = {
        classHash: '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f',
        constructorCalldata: ['0', '201370992843948391271400755079135671431440574923266489436005932020332776584', '1'],
        addressSalt: '0x71f8d14094a3bf658579233267af02c4e5f83aa14ef1fadea28470b4ac4c88',
    };

    try {
        const deployResponse = await account.deployAccount(payload);
        console.log('✅ Deploy Tx Hash:', deployResponse.transaction_hash);
        console.log('⏳ Waiting for confirmation...');
        await provider.waitForTransaction(deployResponse.transaction_hash);
        console.log('\n🎉 Wallet account successfully deployed and activated on Sepolia!');
    } catch (error) {
        console.error('\n❌ Deployment failed:');
        console.error(error.message || error);
    }
}

deployWallet();
