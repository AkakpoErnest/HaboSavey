// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HamaPoints} from "../src/HamaPoints.sol";
import {GameVault} from "../src/GameVault.sol";
import {KesennumaCollectibles} from "../src/KesennumaCollectibles.sol";

contract PointsTest is Test {
    HamaPoints points;
    KesennumaCollectibles items;
    GameVault vault;

    address admin = makeAddr("admin");
    address app = makeAddr("appBackend");
    address game = makeAddr("gameServer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant FISH_ITEM = 1;

    function setUp() public {
        vm.startPrank(admin);
        points = new HamaPoints("Hamarainya Points", "HAMA", admin);
        items = new KesennumaCollectibles("https://example.invalid/items/{id}.json", admin);
        vault = new GameVault(points, items, 1_000, admin);
        points.grantRole(points.MINTER_ROLE(), app);
        points.grantRole(points.MINTER_ROLE(), address(vault));
        items.grantRole(items.MINTER_ROLE(), address(vault));
        vault.grantRole(vault.GAME_ROLE(), game);
        points.setProject(address(vault), true);
        vault.setItemPrice(FISH_ITEM, 30);
        vm.stopPrank();

        vm.prank(app);
        points.award(alice, 100, keccak256("ledger-row-1"));
    }

    function test_onlyMinterCanAward() public {
        vm.expectRevert();
        vm.prank(alice);
        points.award(alice, 1, bytes32(0));
    }

    function test_wholePointsOnly() public view {
        assertEq(points.decimals(), 0);
        assertEq(points.balanceOf(alice), 100);
    }

    function test_walletToWalletTransferReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HamaPoints.TransferNotAllowed.selector, alice, bob));
        points.transfer(bob, 10);
    }

    function test_approveAndTransferFromToWalletReverts() public {
        vm.prank(alice);
        points.approve(bob, 10);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(HamaPoints.TransferNotAllowed.selector, alice, bob));
        points.transferFrom(alice, bob, 10);
    }

    function test_depositToNonProjectReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HamaPoints.NotAProject.selector, bob));
        points.depositTo(bob, 10);
    }

    function test_depositCreditsPlayer() public {
        vm.prank(alice);
        points.depositTo(address(vault), 60);
        assertEq(vault.credits(alice), 60);
        assertEq(points.balanceOf(alice), 40);
        assertEq(points.balanceOf(address(vault)), 60);
    }

    function test_onlyPointsContractCanCredit() public {
        vm.expectRevert(GameVault.OnlyPoints.selector);
        vault.onPointsReceived(alice, 1_000);
    }

    function test_buyItemBurnsPointsAndMintsCollectible() public {
        vm.prank(alice);
        points.depositTo(address(vault), 60);
        uint256 supplyBefore = points.totalSupply();
        vm.prank(game);
        vault.buyItem(alice, FISH_ITEM);
        assertEq(items.balanceOf(alice, FISH_ITEM), 1);
        assertEq(vault.credits(alice), 30);
        assertEq(points.totalSupply(), supplyBefore - 30);
    }

    function test_buyItemNeedsCredits() public {
        vm.prank(game);
        vm.expectRevert(abi.encodeWithSelector(GameVault.InsufficientCredits.selector, 0, 30));
        vault.buyItem(alice, FISH_ITEM);
    }

    function test_onlyGameCanBuyForPlayers() public {
        vm.prank(alice);
        points.depositTo(address(vault), 60);
        vm.prank(bob);
        vm.expectRevert();
        vault.buyItem(alice, FISH_ITEM);
    }

    function test_collectiblesAreSoulbound() public {
        vm.prank(alice);
        points.depositTo(address(vault), 30);
        vm.prank(game);
        vault.buyItem(alice, FISH_ITEM);
        vm.prank(alice);
        vm.expectRevert(KesennumaCollectibles.Soulbound.selector);
        items.safeTransferFrom(alice, bob, FISH_ITEM, 1, "");
    }

    function test_withdrawReturnsUnspentCredits() public {
        vm.prank(alice);
        points.depositTo(address(vault), 60);
        vm.prank(alice);
        vault.withdraw(50);
        assertEq(points.balanceOf(alice), 90);
        assertEq(vault.credits(alice), 10);
    }

    function test_cannotWithdrawMoreThanCredits() public {
        vm.prank(alice);
        points.depositTo(address(vault), 10);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GameVault.InsufficientCredits.selector, 10, 11));
        vault.withdraw(11);
    }

    function test_rewardWithinDailyBudget() public {
        vm.startPrank(game);
        vault.reward(bob, 600, keccak256("match-1"));
        vault.reward(bob, 400, keccak256("match-2"));
        vm.expectRevert(abi.encodeWithSelector(GameVault.RewardBudgetExceeded.selector, 0));
        vault.reward(bob, 1, keccak256("match-3"));
        vm.stopPrank();
        assertEq(points.balanceOf(bob), 1_000);

        vm.warp(block.timestamp + 1 days);
        vm.prank(game);
        vault.reward(bob, 5, keccak256("match-4"));
        assertEq(points.balanceOf(bob), 1_005);
    }

    function test_removedProjectStopsDeposits() public {
        vm.prank(admin);
        points.setProject(address(vault), false);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HamaPoints.NotAProject.selector, address(vault)));
        points.depositTo(address(vault), 1);
    }

    function testFuzz_noPeerTransfers(address to, uint96 amount) public {
        vm.assume(to != address(0) && to != address(vault) && to != alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HamaPoints.TransferNotAllowed.selector, alice, to));
        points.transfer(to, bound(amount, 1, 100));
    }
}
