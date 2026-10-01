// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(uint256 supply) ERC20("Mock Launch Token", "MLT") {
        _mint(msg.sender, supply);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }

    function associate() external pure returns (uint256) {
        return 22;
    }
}
