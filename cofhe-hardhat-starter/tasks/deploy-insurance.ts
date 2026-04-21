import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-insurance', 'Deploy the ConfidentialInsurance (ShieldFi) contract')
  .addOptionalParam('fund', 'Initial pool funding in ETH', '0.1')
  .setAction(async (args: { fund: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre

    console.log(`\n🛡  Deploying ShieldFi — ConfidentialInsurance to ${network.name}...`)

    const [deployer] = await ethers.getSigners()
    console.log(`   Deployer : ${deployer.address}`)
    console.log(`   Balance  : ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`)

    const Insurance = await ethers.getContractFactory('ConfidentialInsurance')
    const insurance = await Insurance.deploy()
    await insurance.waitForDeployment()
    const addr = await insurance.getAddress()
    console.log(`\n✅  ConfidentialInsurance deployed: ${addr}`)

    // Fund the pool
    // const fundAmount = ethers.parseEther(args.fund)
    // if (fundAmount > 0n) {
    //   const tx = await insurance.fundPool({ value: fundAmount })
    //   await tx.wait()
    //   console.log(`💰  Pool funded with ${args.fund} ETH`)
    // }

    saveDeployment(network.name, 'ConfidentialInsurance', addr)

    console.log('\n📋  Contract constants:')
    console.log(`   BASE_PREMIUM     : ${await insurance.BASE_PREMIUM()} units`)
    console.log(`   RISK_DENOMINATOR : ${await insurance.RISK_DENOMINATOR()}`)
    console.log(`   MIN_SEVERITY     : ${await insurance.MIN_SEVERITY()}`)
    console.log(`   PREMIUM_UNIT     : ${ethers.formatEther(await insurance.PREMIUM_UNIT())} ETH/unit\n`)

    return addr
  })
