// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {HamaPoints} from "./HamaPoints.sol";
import {KesennumaCollectibles} from "./KesennumaCollectibles.sol";
import {IPointsProject} from "./IPointsProject.sol";

/**
 * @title GameVault: bridge between HamaPoints and the game
 * @notice Players send points here with HamaPoints.depositTo(vault, n); they become in-game credits.
 *  - the game server (GAME_ROLE) spends credits on collectibles: points are burned, an item is minted
 *  - the game rewards play with NEW points, limited by a daily reward budget
 *  - players can withdraw unspent credits back to their wallet
 * The vault needs HamaPoints.MINTER_ROLE (for rewards) and KesennumaCollectibles.MINTER_ROLE.
 */
contract GameVault is AccessControl, IPointsProject {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    HamaPoints public immutable points;
    KesennumaCollectibles public immutable items;

    mapping(address => uint256) public credits;
    /// itemId => price in points (0 = not for sale)
    mapping(uint256 => uint256) public itemPrice;

    uint256 public dailyRewardBudget;
    uint256 public rewardedToday;
    uint256 public rewardDay;

    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event ItemBought(address indexed player, uint256 indexed itemId, uint256 price);
    event Rewarded(address indexed player, uint256 amount);

    error OnlyPoints();
    error InsufficientCredits(uint256 have, uint256 need);
    error NotForSale(uint256 itemId);
    error RewardBudgetExceeded(uint256 remaining);

    constructor(HamaPoints points_, KesennumaCollectibles items_, uint256 dailyRewardBudget_, address admin) {
        points = points_;
        items = items_;
        dailyRewardBudget = dailyRewardBudget_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function onPointsReceived(address player, uint256 amount) external {
        if (msg.sender != address(points)) revert OnlyPoints();
        credits[player] += amount;
        emit Deposited(player, amount);
    }

    function withdraw(uint256 amount) external {
        _spend(msg.sender, amount);
        points.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function setItemPrice(uint256 itemId, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        itemPrice[itemId] = price;
    }

    function setDailyRewardBudget(uint256 budget) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyRewardBudget = budget;
    }

    /// Game server buys an item for a player from their credits (players sign in to the game; server relays).
    function buyItem(address player, uint256 itemId) external onlyRole(GAME_ROLE) {
        uint256 price = itemPrice[itemId];
        if (price == 0) revert NotForSale(itemId);
        _spend(player, price);
        points.burn(price);
        items.mint(player, itemId, 1);
        emit ItemBought(player, itemId, price);
    }

    /// Game server rewards play with new points, straight to the player's wallet, within the daily budget.
    function reward(address player, uint256 amount, bytes32 ref) external onlyRole(GAME_ROLE) {
        uint256 day = block.timestamp / 1 days;
        if (day != rewardDay) {
            rewardDay = day;
            rewardedToday = 0;
        }
        uint256 remaining = dailyRewardBudget - rewardedToday;
        if (amount > remaining) revert RewardBudgetExceeded(remaining);
        rewardedToday += amount;
        points.award(player, amount, ref);
        emit Rewarded(player, amount);
    }

    function _spend(address player, uint256 amount) private {
        uint256 have = credits[player];
        if (have < amount) revert InsufficientCredits(have, amount);
        credits[player] = have - amount;
    }
}
