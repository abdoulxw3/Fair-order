// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRouter {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address,
        uint256
    ) external payable returns (uint256, uint256, uint256) {
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        return (amountTokenDesired, msg.value, 1);
    }
}
