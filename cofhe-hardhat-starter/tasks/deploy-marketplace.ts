import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployment, saveDeployment } from './utils'

task('deploy-marketplace', 'Deploy the PolicyMarketplace contract')
  .addOptionalParam('insurance', 'ConfidentialInsurance (NFT) contract address — reads from deployments if omitted', '')
  .setAction(async (
    args: { insurance: string },
    hre: HardhatRuntimeEnvironment
  ) => {
    const { ethers, network } = hre

    console.log(`\n🏪  Deploying PolicyMarketplace to ${network.name}...`)

    const [deployer] = await ethers.getSigners()
    console.log(`   Deployer : ${deployer.address}`)
    console.log(`   Balance  : ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`)

    // Resolve insurance address
    let insuranceAddr = args.insurance
    if (!insuranceAddr) {
      const saved = getDeployment(network.name, 'ConfidentialInsurance')
      if (!saved) throw new Error('ConfidentialInsurance not deployed on this network. Run deploy-insurance first, or pass --insurance <addr>')
      insuranceAddr = saved
    }
    console.log(`\n📋  ConfidentialInsurance (NFT): ${insuranceAddr}`)

    const Marketplace = await ethers.getContractFactory('PolicyMarketplace')
    const marketplace = await Marketplace.deploy(insuranceAddr)
    await marketplace.waitForDeployment()
    const addr = await marketplace.getAddress()
    console.log(`\n✅  PolicyMarketplace deployed: ${addr}`)

    saveDeployment(network.name, 'PolicyMarketplace', addr)

    console.log('\n📋  Next steps:')
    console.log(`   • Add NEXT_PUBLIC_MARKETPLACE_ADDRESS_<CHAIN_ID>=${addr} to frontend/.env.local`)
    console.log(`   • Approve marketplace in ConfidentialInsurance: setApprovalForAll(${addr}, true)\n`)

    return addr
  })
