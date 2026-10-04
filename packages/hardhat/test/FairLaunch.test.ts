import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

const PRICE = 2n;
const SUPPLY = 1_000n;
const TOPIC = "0.0.1234";

async function setup() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const token = await ethers.deployContract("MockToken", [SUPPLY]);
  const router = await ethers.deployContract("MockRouter");
  const launch = await ethers.deployContract("FairLaunch", [
    owner.address,
    await token.getAddress(),
    await router.getAddress(),
    PRICE,
    TOPIC,
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
  it("stores its configuration", async () => {
    const { owner, token, router, launch } = await setup();
    expect(await launch.owner()).to.equal(owner.address);
    expect(await launch.token()).to.equal(await token.getAddress());
    expect(await launch.router()).to.equal(await router.getAddress());
    expect(await launch.tinybarPerUnit()).to.equal(PRICE);
    expect(await launch.topicId()).to.equal(TOPIC);
  });

  it("rejects claims before allocations are published", async () => {
    const [owner, alice] = await ethers.getSigners();
    const token = await ethers.deployContract("MockToken", [SUPPLY]);
    const launch = await ethers.deployContract("FairLaunch", [
      owner.address,
      await token.getAddress(),
      ethers.ZeroAddress,
      PRICE,
      TOPIC,
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

  it("rejects a valid proof used with a different amount", async () => {
    const { alice, launch, tree } = await setup();
    await expect(
      launch.connect(alice).claim(500, tree.getProof(0), { value: 500n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "InvalidProof");
  });

  it("rejects another account's proof", async () => {
    const { bob, launch, tree } = await setup();
    await expect(
      launch.connect(bob).claim(400, tree.getProof(0), { value: 400n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "InvalidProof");
  });

  it("rejects a tampered proof", async () => {
    const { alice, launch } = await setup();
    await expect(
      launch.connect(alice).claim(600, [ethers.ZeroHash], { value: 600n * PRICE }),
    ).to.be.revertedWithCustomError(launch, "InvalidProof");
  });

  it("reconciles tokens and HBAR when every allocation is claimed", async () => {
    const { alice, bob, token, launch, tree } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });
    await launch.connect(bob).claim(400, tree.getProof(1), { value: 400n * PRICE });

    expect(await token.balanceOf(alice.address)).to.equal(600);
    expect(await token.balanceOf(bob.address)).to.equal(400);
    expect(await token.balanceOf(await launch.getAddress())).to.equal(0);
    expect(await ethers.provider.getBalance(await launch.getAddress())).to.equal(SUPPLY * PRICE);
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

  it("only lets the owner publish allocations", async () => {
    const { alice, launch, tree, deadline } = await setup();
    await expect(launch.connect(alice).publishAllocations(tree.root, deadline))
      .to.be.revertedWithCustomError(launch, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
  });

  it("seeds liquidity only after claims close", async () => {
    const { alice, token, router, launch, tree, deadline } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });

    await expect(
      launch.seedLiquidity(400, 1_200, 0, 0, { value: 300 }),
    ).to.be.revertedWithCustomError(launch, "ClaimStillOpen");

    await time.increaseTo(deadline + 1);
    await launch.seedLiquidity(400, 1_200, 0, 0, { value: 300 });
    expect(await token.balanceOf(await router.getAddress())).to.equal(400);
    expect(await ethers.provider.getBalance(await router.getAddress())).to.equal(1_500);
  });

  it("announces the liquidity it seeds", async () => {
    const { alice, launch, tree, deadline } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });
    await time.increaseTo(deadline + 1);
    await expect(launch.seedLiquidity(400, 1_200, 0, 0, { value: 300 }))
      .to.emit(launch, "LiquiditySeeded")
      .withArgs(400, 1_200);
  });

  it("only lets the owner seed liquidity", async () => {
    const { alice, launch, deadline } = await setup();
    await time.increaseTo(deadline + 1);
    await expect(launch.connect(alice).seedLiquidity(0, 0, 0, 0))
      .to.be.revertedWithCustomError(launch, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
  });

  it("sweeps leftovers to the owner after claims close", async () => {
    const { owner, token, launch, deadline } = await setup();
    await time.increaseTo(deadline + 1);
    await launch.sweep();
    expect(await token.balanceOf(owner.address)).to.equal(SUPPLY);
  });

  it("sweeps the unclaimed tokens and the raised HBAR", async () => {
    const { owner, alice, token, launch, tree, deadline } = await setup();
    await launch.connect(alice).claim(600, tree.getProof(0), { value: 600n * PRICE });
    await time.increaseTo(deadline + 1);

    await expect(launch.sweep()).to.emit(launch, "Swept").withArgs(600n * PRICE, 400);
    expect(await token.balanceOf(owner.address)).to.equal(400);
    expect(await ethers.provider.getBalance(await launch.getAddress())).to.equal(0);
  });

  it("does not sweep while claims are open", async () => {
    const { launch } = await setup();
    await expect(launch.sweep()).to.be.revertedWithCustomError(launch, "ClaimStillOpen");
  });

  it("only lets the owner sweep", async () => {
    const { alice, launch, deadline } = await setup();
    await time.increaseTo(deadline + 1);
    await expect(launch.connect(alice).sweep())
      .to.be.revertedWithCustomError(launch, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
  });
});
