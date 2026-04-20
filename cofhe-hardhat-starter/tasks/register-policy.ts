import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Encryptable, FheTypes } from '@cofhe/sdk'
import { getDeployment, createCofheClient } from './utils'

task('register-policy', 'Register a confidential insurance policy')
  .addParam('age',       'Your age in years (will be encrypted)',        '35',  types.int)
  .addParam('risk',      'Risk score 1–100 (will be encrypted)',         '50',  types.int)
  .addParam('coverage',  'Coverage amount in units (will be encrypted)', '100', types.int)
  .setAction(async (args: { age: number; risk: number; coverage: number }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre

    const addr = getDeployment(network.name, 'ConfidentialInsurance')
    if (!addr) throw new Error('ConfidentialInsurance not deployed — run deploy-insurance first')

    const [signer] = await ethers.getSigners()
    const client   = await createCofheClient(hre, signer)

    console.log(`\n🔐  Encrypting risk inputs (plaintext never leaves your device)...`)
    console.log(`   Age      : ${args.age}`)
    console.log(`   Risk     : ${args.risk}`)
    console.log(`   Coverage : ${args.coverage} units`)

    const encrypted = await client
      .encryptInputs([
        Encryptable.uint64(BigInt(args.age)),
        Encryptable.uint64(BigInt(args.risk)),
        Encryptable.uint64(BigInt(args.coverage)),
      ])
      .execute()

    const Insurance = await ethers.getContractAt('ConfidentialInsurance', addr, signer)
    const tx = await Insurance.registerPolicy(encrypted[0], encrypted[1], encrypted[2])
    const receipt = await tx.wait()

    const event = receipt?.logs
      .map(l => { try { return Insurance.interface.parseLog(l) } catch { return null } })
      .find(e => e?.name === 'PolicyRegistered')

    const policyId = event?.args?.policyId
    console.log(`\n✅  Policy registered! ID: ${policyId}`)
    console.log(`   Premium is encrypted on-chain — run reveal-premium to view it.`)

    // Verify FHE-computed premium in mock environment
    if (network.name === 'hardhat' || network.name === 'localcofhe') {
      const [,,, premiumHandle] = await Insurance.getPolicyHandles(policyId)
      const premiumUnits = await (hre as any).cofhe.mocks.getPlaintext(premiumHandle)
      const expectedPremium = 5n + (BigInt(args.risk) * BigInt(args.coverage)) / 100n
      console.log(`\n🔬  Mock verification (local only):`)
      console.log(`   FHE-computed premium : ${premiumUnits} units`)
      console.log(`   Expected             : ${expectedPremium} units`)
      console.log(`   Match                : ${premiumUnits === expectedPremium ? '✅' : '❌'}`)
    }

    return policyId?.toString()
  })
