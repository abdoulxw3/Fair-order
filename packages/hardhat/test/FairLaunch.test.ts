import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

const PRICE = 2n;
const SUPPLY = 1_000n;

async function setup() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const token = await ethers.deployContract("MockToken", [SUPPLY]);
  const router = await ethers.deployContract("MockRouter");
  const launch = await ethers.deployContract("FairLaunch", [
    owner.address,
    await token.getAddress(),
    await router.getAddress(),
    PRICE,
    "0.0.1234",
  ]);
  await token.transfer(await launch.getAddress(), SUPPLY);

  const tree = StandardMerkleTree.of(
    [
      [alice.address, "600"],
      [bob.address, "400"],
    ],
    ["address", "uint256"],
  );
  const deadline = (await time.latest()) + 1_000;
  await launch.publishAllocations(tree.root, deadline);

  return { owner, alice, bob, carol, token, router, launch, tree, deadline };
}

describe("FairLaunch", () => {
  it("rejects claims before allocations are published", async () => {
    const [owner, alice] = await ethers.getSigners();
    const token = await ethers.deployContract("MockToken", [SUPPLY]);
    const launch = await ethers.deployContract("FairLaunch", [
      owner.address,
      await token.getAddress(),
      ethers.ZeroAddress,
      PRICE,
      "0.0.1234",
    ]);
    await expect(launch.connect(alice).claim(1, [])).to.be.revertedWithCustomError(
      launch,
      "NotPublished",
    );
  });

  it("pays out tokens for the exact HBAR price", async () => {
    const { alice, token, launch, tree } = await setup();
    await expect(launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE }))
      .to.emit(launch, "Claimed")
      .withArgs(alice.address, 600);
    expect(await token.balanceOf(alice.address)).to.equal(600);
  });

  it("rejects a second claim from the same account", async () => {
    const { alice, launch, tree } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });
    await expect(
      launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "AlreadyClaimed");
  });

  it("rejects an incorrect payment", async () => {
    const { alice, launch, tree } = await setup();
    await expect(
      launch.connect(alice).claim(600, tree.getProof(0), { value: 1 }),
    ).to.be.revertedWithCustomError(launch, "WrongPayment");
  });

  it("rejects accounts that are not in the allocation", async () => {
    const { carol, launch, tree } = await setup();
    await expect(
      launch.connect(carol).claim(600, tree.getProof(0), { value: 600n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "InvalidProof");
  });

  it("closes claims at the deadline", async () => {
    const { alice, launch, tree, deadline } = await setup();
    await time.increaseTo(deadline + 1);
    await expect(
      launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "ClaimClosed");
  });

  it("only publishes allocations once", async () => {
    const { launch, tree, deadline } = await setup();
    await expect(launch.publishAllocations(tree.root, deadline)).to.be.revertedWithCustomError(
      launch,
      "AlreadyPublished",
    );
  });

  it("seeds liquidity only after claims close", async () => {
    const { alice, token, router, launch, tree, deadline } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });

    await expect(launch.seedLiquidity(400, 1_200, 0, 0)).to.be.revertedWithCustomError(
      launch,
      "ClaimStillOpen",
    );

    await time.increaseTo(deadline + 1);
    await launch.seedLiquidity(400, 1_200, 0, 0);
    expect(await token.balanceOf(await router.getAddress())).to.equal(400);
  });

  it("sweeps leftovers to the owner after claims close", async () => {
    const { owner, token, launch, deadline } = await setup();
    await time.increaseTo(deadline + 1);
    await launch.sweep();
    expect(await token.balanceOf(owner.address)).to.equal(SUPPLY);
  });
});
