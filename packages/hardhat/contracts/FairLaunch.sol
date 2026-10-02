// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IHRC719} from "./interfaces/IHRC719.sol";
import {ISaucerRouter} from "./interfaces/ISaucerRouter.sol";

/// @notice Token sale where allocations follow the HCS consensus order of bids.
/// The owner publishes a Merkle root of allocations computed from the topic's message log.
/// Anyone can recompute it from the mirror node. Buyers claim by paying HBAR, and the
/// proceeds can seed a SaucerSwap pool once claiming ends.
/// @dev Inside the Hedera EVM, msg.value and balances are denominated in tinybars.
contract FairLaunch is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant SUCCESS = 22;
    uint256 private constant ALREADY_ASSOCIATED = 194;
    uint256 private constant SEED_WINDOW = 300;

    IERC20 public immutable token;
    ISaucerRouter public immutable router;
    uint256 public immutable tinybarPerUnit;
    string public topicId;

    bytes32 public merkleRoot;
    uint256 public claimDeadline;
    mapping(address => bool) public claimed;

    event AllocationsPublished(bytes32 root, uint256 claimDeadline);
    event Claimed(address indexed account, uint256 amount);
    event LiquiditySeeded(uint256 tokenAmount, uint256 hbarAmount);
    event Swept(uint256 hbarAmount, uint256 tokenAmount);

    error AlreadyPublished();
    error NotPublished();
    error ClaimClosed();
    error ClaimStillOpen();
    error AlreadyClaimed();
    error InvalidProof();
    error WrongPayment();
    error AssociationFailed(uint256 code);
    error HbarTransferFailed();

    constructor(
        address initialOwner,
        address token_,
        address router_,
        uint256 tinybarPerUnit_,
        string memory topicId_
    ) Ownable(initialOwner) {
        token = IERC20(token_);
        router = ISaucerRouter(router_);
        tinybarPerUnit = tinybarPerUnit_;
        topicId = topicId_;

        uint256 code = IHRC719(token_).associate();
        if (code != SUCCESS && code != ALREADY_ASSOCIATED) revert AssociationFailed(code);
    }

    function publishAllocations(bytes32 root, uint256 deadline) external onlyOwner {
        if (merkleRoot != bytes32(0)) revert AlreadyPublished();
        merkleRoot = root;
        claimDeadline = deadline;
        emit AllocationsPublished(root, deadline);
    }

    function claim(uint256 amount, bytes32[] calldata proof) external payable nonReentrant {
        if (merkleRoot == bytes32(0)) revert NotPublished();
        if (block.timestamp > claimDeadline) revert ClaimClosed();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (msg.value != amount * tinybarPerUnit) revert WrongPayment();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf)) revert InvalidProof();

        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @dev Creates the SaucerSwap pool, so msg.value must cover the pool creation fee. Any surplus joins the pool.
    /// LP tokens go to the owner, who needs a free auto-association slot to receive them.
    function seedLiquidity(
        uint256 tokenAmount,
        uint256 hbarAmount,
        uint256 minToken,
        uint256 minHbar
    ) external payable onlyOwner nonReentrant {
        if (block.timestamp <= claimDeadline) revert ClaimStillOpen();
        token.forceApprove(address(router), tokenAmount);
        router.addLiquidityETHNewPool{value: hbarAmount + msg.value}(
            address(token),
            tokenAmount,
            minToken,
            minHbar,
            owner(),
            block.timestamp + SEED_WINDOW
        );
        emit LiquiditySeeded(tokenAmount, hbarAmount);
    }

    function sweep() external onlyOwner nonReentrant {
        if (block.timestamp <= claimDeadline) revert ClaimStillOpen();
        uint256 hbarAmount = address(this).balance;
        uint256 tokenAmount = token.balanceOf(address(this));
        if (tokenAmount > 0) token.safeTransfer(owner(), tokenAmount);
        (bool ok, ) = owner().call{value: hbarAmount}("");
        if (!ok) revert HbarTransferFailed();
        emit Swept(hbarAmount, tokenAmount);
    }
}
