import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { expect } from "chai";
import { ethers } from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("ConfidentialInsurance — ShieldFi", function () {

  // ── Fixture ──────────────────────────────────────────────────────────────
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [deployer, alice, bob, carol] = await hre.ethers.getSigners();

    const Insurance = await hre.ethers.getContractFactory("ConfidentialInsurance");
    const insurance = await Insurance.connect(deployer).deploy();

    // Seed the pool with 1 ETH
    await insurance.fundPool({ value: ethers.parseEther("1") });

    const clientAlice = await hre.cofhe.createClientWithBatteries(alice);
    const clientBob   = await hre.cofhe.createClientWithBatteries(bob);

    return { insurance, deployer, alice, bob, carol, clientAlice, clientBob };
  }

  // Helper: register a policy and pay premium
  async function registerAndPay(
    insurance: any,
    client: any,
    signer: any,
    age = 35n, risk = 50n, coverage = 100n
  ) {
    const enc = await client.encryptInputs([
      Encryptable.uint64(age),
      Encryptable.uint64(risk),
      Encryptable.uint64(coverage),
    ]).execute();
    const tx = await insurance.connect(signer).registerPolicy(enc[0], enc[1], enc[2]);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l: any) => { try { return insurance.interface.parseLog(l) } catch { return null } })
      .find((e: any) => e?.name === "PolicyRegistered");
    const policyId: bigint = event.args.policyId;

    // Pay premium (0.001 ETH = 10 units)
    await insurance.connect(signer).payPremium(policyId, {
      value: ethers.parseEther("0.001"),
    });

    return policyId;
  }

  // ── Policy Registration ──────────────────────────────────────────────────
  describe("Policy Registration", function () {
    it("registers a policy and tracks user policies", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(35n),
        Encryptable.uint64(60n),
        Encryptable.uint64(80n),
      ]).execute();

      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      const ids = await insurance.getUserPolicies(alice.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(1n);

      expect(await insurance.totalPolicies()).to.equal(1n);
      expect(await insurance.totalActivePolicies()).to.equal(1n);
    });

    it("computes FHE premium: BASE(5) + (riskScore × coverage) ÷ 100", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);

      // age=30, risk=50, coverage=100 → premium = 5 + (50×100)/100 = 55
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n),
        Encryptable.uint64(50n),
        Encryptable.uint64(100n),
      ]).execute();

      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      const [,,, premiumHandle] = await insurance.getPolicyHandles(1n);
      const premium = await hre.cofhe.mocks.getPlaintext(premiumHandle);
      expect(premium).to.equal(55n); // 5 + 50 = 55
    });

    it("premium scales correctly with higher risk and coverage", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);

      // age=45, risk=80, coverage=200 → premium = 5 + (80×200)/100 = 5 + 160 = 165
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(45n),
        Encryptable.uint64(80n),
        Encryptable.uint64(200n),
      ]).execute();

      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      const [,,, premiumHandle] = await insurance.getPolicyHandles(1n);
      const premium = await hre.cofhe.mocks.getPlaintext(premiumHandle);
      expect(premium).to.equal(165n);
    });

    it("two users have independent encrypted policies", async function () {
      const { insurance, alice, bob, clientAlice, clientBob } = await loadFixture(deployFixture);

      const encA = await clientAlice.encryptInputs([
        Encryptable.uint64(30n), Encryptable.uint64(40n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(encA[0], encA[1], encA[2]);

      const encB = await clientBob.encryptInputs([
        Encryptable.uint64(55n), Encryptable.uint64(90n), Encryptable.uint64(200n),
      ]).execute();
      await insurance.connect(bob).registerPolicy(encB[0], encB[1], encB[2]);

      expect(await insurance.totalPolicies()).to.equal(2n);

      const idsA = await insurance.getUserPolicies(alice.address);
      const idsB = await insurance.getUserPolicies(bob.address);
      expect(idsA[0]).to.equal(1n);
      expect(idsB[0]).to.equal(2n);
    });
  });

  // ── Premium Payment ──────────────────────────────────────────────────────
  describe("Premium Payment", function () {
    it("reverts if premium is below minimum", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n), Encryptable.uint64(50n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      await expect(
        insurance.connect(alice).payPremium(1n, { value: 0n }),
      ).to.be.revertedWith("Minimum premium is 0.0001 ETH");
    });

    it("extends coverage period on payment", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n), Encryptable.uint64(50n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);
      await insurance.connect(alice).payPremium(1n, { value: ethers.parseEther("0.001") });

      const policy = await insurance.policies(1n);
      expect(policy.premiumPaidUntil).to.be.gt(0n);

      expect(await insurance.poolBalance()).to.be.gte(ethers.parseEther("0.001"));
    });
  });

  // ── Claims ───────────────────────────────────────────────────────────────
  describe("Claims", function () {
    it("files a valid claim: amount ≤ coverage AND severity ≥ 30", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const policyId = await registerAndPay(insurance, clientAlice, alice, 35n, 50n, 100n);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(80n),  // amount (≤ 100)
        Encryptable.uint64(60n),  // severity (≥ 30)
      ]).execute();

      await insurance.connect(alice).fileClaim(policyId, enc[0], enc[1]);

      const [,,, isValidHandle] = await insurance.getClaimHandles(1n);
      const isValid = await hre.cofhe.mocks.getPlaintext(isValidHandle);
      expect(isValid).to.equal(1n); // valid
    });

    it("FHE marks invalid: amount > coverage", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const policyId = await registerAndPay(insurance, clientAlice, alice, 35n, 50n, 100n);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(150n), // amount (> 100 coverage) — invalid
        Encryptable.uint64(60n),
      ]).execute();

      await insurance.connect(alice).fileClaim(policyId, enc[0], enc[1]);

      const [,,, isValidHandle] = await insurance.getClaimHandles(1n);
      const isValid = await hre.cofhe.mocks.getPlaintext(isValidHandle);
      expect(isValid).to.equal(0n); // invalid — amount exceeded coverage
    });

    it("FHE marks invalid: severity below MIN_SEVERITY (30)", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const policyId = await registerAndPay(insurance, clientAlice, alice, 35n, 50n, 100n);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(50n),
        Encryptable.uint64(20n),  // severity < 30 — insufficient
      ]).execute();

      await insurance.connect(alice).fileClaim(policyId, enc[0], enc[1]);

      const [,,, isValidHandle] = await insurance.getClaimHandles(1n);
      const isValid = await hre.cofhe.mocks.getPlaintext(isValidHandle);
      expect(isValid).to.equal(0n);
    });

    it("FHE.select: severity ≥ 70 selects full payout (100%)", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const policyId = await registerAndPay(insurance, clientAlice, alice, 35n, 50n, 100n);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(80n), // claim amount
        Encryptable.uint64(75n), // severity ≥ 70 → full payout
      ]).execute();

      await insurance.connect(alice).fileClaim(policyId, enc[0], enc[1]);

      const [,, payoutHandle] = await insurance.getClaimHandles(1n);
      const payout = await hre.cofhe.mocks.getPlaintext(payoutHandle);
      expect(payout).to.equal(80n); // full 80 units
    });

    it("FHE.select: severity < 70 selects half payout (50%)", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const policyId = await registerAndPay(insurance, clientAlice, alice, 35n, 50n, 100n);

      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(80n), // claim amount
        Encryptable.uint64(50n), // severity < 70 → half payout
      ]).execute();

      await insurance.connect(alice).fileClaim(policyId, enc[0], enc[1]);

      const [,, payoutHandle] = await insurance.getClaimHandles(1n);
      const payout = await hre.cofhe.mocks.getPlaintext(payoutHandle);
      expect(payout).to.equal(40n); // 50% of 80 = 40
    });

    it("reverts if premium is overdue", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      // Register without paying premium
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(35n), Encryptable.uint64(50n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      const claimEnc = await clientAlice.encryptInputs([
        Encryptable.uint64(50n), Encryptable.uint64(60n),
      ]).execute();

      await expect(
        insurance.connect(alice).fileClaim(1n, claimEnc[0], claimEnc[1]),
      ).to.be.revertedWithCustomError(insurance, "PremiumOverdue");
    });
  });

  // ── 3-Step Decrypt Flow ───────────────────────────────────────────────────
  describe("Premium Reveal (3-step CoFHE flow)", function () {
    it("reveals encrypted premium via publishDecryptResult", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);

      // age=30, risk=50, coverage=100 → expected premium = 55
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n),
        Encryptable.uint64(50n),
        Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      // Step 1 (on-chain): grant public ACL so CoFHE SDK can decrypt off-chain
      await insurance.connect(alice).requestPremiumReveal(1n);

      // Step 2 (off-chain): CoFHE SDK decrypts and returns signed plaintext
      const [,,, premiumHandle] = await insurance.getPolicyHandles(1n);
      const result = await clientAlice
        .decryptForTx(premiumHandle)
        .withoutPermit()
        .execute();

      // Step 3 (on-chain): publish signed result
      await insurance.connect(alice).revealPremium(1n, result.decryptedValue, result.signature);

      // Verify the revealed value
      const [units, ready] = await insurance.getRevealedPremium(1n);
      expect(ready).to.be.true;
      expect(units).to.equal(55n);
    });
  });

  // ── Pool Funding ─────────────────────────────────────────────────────────
  describe("Pool", function () {
    it("tracks pool balance after funding", async function () {
      const { insurance, deployer } = await loadFixture(deployFixture);
      const before = await insurance.poolBalance();
      await insurance.fundPool({ value: ethers.parseEther("0.5") });
      const after = await insurance.poolBalance();
      expect(after - before).to.equal(ethers.parseEther("0.5"));
    });

    it("getPoolStats returns aggregate data (no individual exposure)", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      await registerAndPay(insurance, clientAlice, alice);

      const [bal, total, active, claims, approved, payouts] = await insurance.getPoolStats();
      expect(total).to.equal(1n);
      expect(active).to.equal(1n);
      expect(claims).to.equal(0n);
      expect(approved).to.equal(0n);
      expect(payouts).to.equal(0n);
    });
  });

  // ── Policy Cancellation ──────────────────────────────────────────────────
  describe("Policy Cancellation", function () {
    it("cancels an active policy", async function () {
      const { insurance, alice, clientAlice } = await loadFixture(deployFixture);
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n), Encryptable.uint64(50n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);
      await insurance.connect(alice).cancelPolicy(1n);

      const policy = await insurance.policies(1n);
      expect(policy.status).to.equal(2); // Cancelled
      expect(await insurance.totalActivePolicies()).to.equal(0n);
    });

    it("reverts if non-holder tries to cancel", async function () {
      const { insurance, alice, bob, clientAlice } = await loadFixture(deployFixture);
      const enc = await clientAlice.encryptInputs([
        Encryptable.uint64(30n), Encryptable.uint64(50n), Encryptable.uint64(100n),
      ]).execute();
      await insurance.connect(alice).registerPolicy(enc[0], enc[1], enc[2]);

      await expect(
        insurance.connect(bob).cancelPolicy(1n),
      ).to.be.revertedWithCustomError(insurance, "NotPolicyHolder");
    });
  });
});
