// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SekaiAgent} from "../src/SekaiAgent.sol";
import {MissionVault} from "../src/MissionVault.sol";

/**
 * @notice Deploy SekaiAgent + MissionVault to 0G Mainnet.
 * @dev Broadcast in Phase 5 with funded keys:
 *      forge script script/Deploy.s.sol:DeployScript --rpc-url $OG_RPC_URL --broadcast
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY
 *   ADMIN_ADDRESS (optional; defaults to deployer)
 *   RELAYER_ADDRESS (optional; defaults to deployer)
 */
contract DeployScript is Script {
    // ERC-8004 Identity Registry on 0G Mainnet (discoverability hook target)
    address public constant ERC8004_IDENTITY_REGISTRY =
        0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        address relayer = vm.envOr("RELAYER_ADDRESS", deployer);

        vm.startBroadcast(deployerKey);

        SekaiAgent agent = new SekaiAgent(admin);
        MissionVault vault = new MissionVault(admin, relayer, address(agent));

        vm.stopBroadcast();

        console2.log("SekaiAgent", address(agent));
        console2.log("MissionVault", address(vault));
        console2.log("Admin", admin);
        console2.log("Relayer", relayer);
        console2.log("ERC8004 Identity Registry (register agents off-chain/API)", ERC8004_IDENTITY_REGISTRY);
    }
}
