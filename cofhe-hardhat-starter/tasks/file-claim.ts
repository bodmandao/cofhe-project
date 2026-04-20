import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Encryptable } from '@cofhe/sdk'
import { getDeployment, createCofheClient } from './utils'

task('file-claim', 'File a confidential insurance claim')
  .addParam('policy',   'Policy ID to claim against',                      '',   types.string)
  .addParam('amount',   'Claim amount in units (will be encrypted)',        '50', types.int)
  .addParam('severity', 'Incident severity 0–100 (will be encrypted)',     '65', types.int)
  .setAction(async (
    args: { policy: string; amount: number; severity: number },
    hre: HardhatRuntimeEnvironment
  ) => {
    const { ethers, network } = hre

    const addr = getDeployment(network.name, 'ConfidentialInsurance')
    if (!addr) throw new Error('ConfidentialInsurance not deployed')

    const [signer] = await ethers.getSigners()
    const client   = await createCofheClient(hre, signer)

    console.log(`\n🔐  Encrypting claim data...`)
    console.log(`   Policy ID : ${args.policy}`)
    console.log(`   Amount    : ${args.amount} units`)
    console.log(`   Severity  : ${args.severity}/100`)

    const encrypted = await client
      .encryptInputs([
        Encryptable.uint64(BigInt(args.amount)),
        Encryptable.uint64(BigInt(args.severity)),
      ])
      .execute()

    const Insurance = await ethers.getContractAt('ConfidentialInsurance', addr, signer)
    const tx = await Insurance.fileClaim(args.policy, encrypted[0], encrypted[1])
    const receipt = await tx.wait()

    const event = receipt?.logs
      .map(l => { try { return Insurance.interface.parseLog(l) } catch { return null } })
      .find(e => e?.name === 'ClaimFiled')

    const claimId = event?.args?.claimId
    console.log(`\n✅  Claim filed! ID: ${claimId}`)
    console.log(`   FHE has validated: amount ≤ coverage AND severity ≥ MIN_SEVERITY`)
    console.log(`   Tier payout computed via FHE.select (severity ≥ 70 → full, else 50%)`)

    if (network.name === 'hardhat' || network.name === 'localcofhe') {
      const [,,, isValidHandle] = await Insurance.getClaimHandles(claimId)
      const isValid = await (hre as any).cofhe.mocks.getPlaintext(isValidHandle)
      console.log(`\n🔬  Mock verification (local only):`)
      console.log(`   FHE isValid : ${isValid === 1n ? '✅ Claim is valid' : '❌ Claim is invalid'}`)
    }

    return claimId?.toString()
  })
