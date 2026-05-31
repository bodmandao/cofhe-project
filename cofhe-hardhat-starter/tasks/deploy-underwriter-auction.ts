import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployment, saveDeployment } from './utils'

task('deploy-underwriter-auction', 'Deploy the UnderwriterAuction contract')
  .addOptionalParam('owner', 'Committee owner address (default: deployer)', '')
  .setAction(async (
    args: { owner: string },
    hre: HardhatRuntimeEnvironment
  ) => {
    const { ethers, network } = hre

    console.log(`\n🏛  Deploying UnderwriterAuction to ${network.name}...`)

    const [deployer] = await ethers.getSigners()
    console.log(`   Deployer : ${deployer.address}`)
    console.log(`   Balance  : ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`)

    const ownerAddr = args.owner || deployer.address
    console.log(`\n👑  Committee owner: ${ownerAddr}`)

    // Optionally check for the insurance deployment for logging purposes
    const insuranceAddr = getDeployment(network.name, 'ConfidentialInsurance')
    if (insuranceAddr) {
      console.log(`📋  ConfidentialInsurance (reference): ${insuranceAddr}`)
    }

    const Auction = await ethers.getContractFactory('UnderwriterAuction')
    const auction = await Auction.deploy(ownerAddr)
    await auction.waitForDeployment()
    const addr = await auction.getAddress()
    console.log(`\n✅  UnderwriterAuction deployed: ${addr}`)

    saveDeployment(network.name, 'UnderwriterAuction', addr)

    console.log('\n📋  Next steps:')
    console.log(`   • Add NEXT_PUBLIC_UNDERWRITER_AUCTION_ADDRESS_<CHAIN>=${addr} to frontend/.env`)
    console.log(`   • Call createTranche(riskTier, targetCapacity) to open the first tranche\n`)

    return addr
  })
