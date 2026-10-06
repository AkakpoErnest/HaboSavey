// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IPointsProject} from "./IPointsProject.sol";

/**
 * @title HamaPoints: Citizen Sentiment participation points (Kesennuma)
 * @notice Earned for taking part in city polls/surveys; never sold. Deliberately NOT freely transferable:
 *  - only MINTER_ROLE (the app backend; approved projects for rewards) can mint
 *  - holders can only move points INTO allow-listed projects (e.g. the game vault)
 *  - projects can send points back to players (refunds, rewards)
 * Wallet-to-wallet transfers revert, so points can't be traded peer to peer.
 * Name/symbol are set at deploy (e.g. "Hamarainya Points"; "Hoya Boya" needs Kesennuma City's approval).
 */
contract HamaPoints is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PROJECT_ADMIN_ROLE = keccak256("PROJECT_ADMIN_ROLE");

    mapping(address => bool) public isProject;

    event ProjectSet(address indexed project, bool allowed);
    event Awarded(address indexed to, uint256 amount, bytes32 indexed ref);

    error TransferNotAllowed(address from, address to);
    error NotAProject(address target);

    constructor(string memory name_, string memory symbol_, address admin) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROJECT_ADMIN_ROLE, admin);
    }

    /// Whole points only.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function setProject(address project, bool allowed) external onlyRole(PROJECT_ADMIN_ROLE) {
        isProject[project] = allowed;
        emit ProjectSet(project, allowed);
    }

    /// @param ref off-chain ledger reference (e.g. hash of the points_ledger row id) for auditability.
    function award(address to, uint256 amount, bytes32 ref) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit Awarded(to, amount, ref);
    }

    /// One-step "send to project": moves points into an allow-listed project and notifies it. No approve needed.
    function depositTo(address project, uint256 amount) external {
        if (!isProject[project]) revert NotAProject(project);
        _transfer(msg.sender, project, amount);
        IPointsProject(project).onPointsReceived(msg.sender, amount);
    }

    /// Holders (and projects) may burn their own points.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        bool mintOrBurn = from == address(0) || to == address(0);
        if (!mintOrBurn && !isProject[to] && !isProject[from]) revert TransferNotAllowed(from, to);
        super._update(from, to, value);
    }
}
