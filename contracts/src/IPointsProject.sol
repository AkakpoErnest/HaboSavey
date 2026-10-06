// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Implemented by projects (e.g. the game vault) that accept points via HamaPoints.depositTo.
interface IPointsProject {
    function onPointsReceived(address player, uint256 amount) external;
}
