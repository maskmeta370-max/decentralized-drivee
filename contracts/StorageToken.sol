// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title StorageToken (STOR)
 * @dev ERC20 token for decentralized storage network incentives
 * Features:
 * - Mintable by owner for network rewards
 * - Burnable for deflationary mechanics
 * - Pausable for emergency situations
 * - Staking rewards for storage providers
 * - Governance voting power
 */
contract StorageToken is ERC20, ERC20Burnable, Ownable, Pausable {
    using SafeMath for uint256;

    // Token configuration
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10**18; // 100 million tokens
    
    // Staking configuration
    struct StakingInfo {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 lastRewardClaim;
        uint256 accumulatedRewards;
    }
    
    mapping(address => StakingInfo) public stakingInfo;
    mapping(address => bool) public authorizedMinters;
    
    uint256 public totalStaked;
    uint256 public stakingRewardRate = 5; // 5% annual reward rate
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    uint256 public minimumStakingPeriod = 7 days;
    
    // Governance
    mapping(address => uint256) public votingPower;
    uint256 public totalVotingPower;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event StakingRewardRateUpdated(uint256 newRate);
    event VotingPowerUpdated(address indexed user, uint256 newPower);

    constructor() ERC20("StorageToken", "STOR") {
        _mint(msg.sender, INITIAL_SUPPLY);
        authorizedMinters[msg.sender] = true;
    }

    /**
     * @dev Mint new tokens (only authorized minters)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(totalSupply().add(amount) <= MAX_SUPPLY, "Exceeds maximum supply");
        
        _mint(to, amount);
    }

    /**
     * @dev Add authorized minter (only owner)
     * @param minter Address to authorize
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @dev Remove authorized minter (only owner)
     * @param minter Address to remove authorization
     */
    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @dev Stake tokens to earn rewards and gain voting power
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Claim pending rewards before updating stake
        if (stakingInfo[msg.sender].stakedAmount > 0) {
            _claimRewards(msg.sender);
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking info
        StakingInfo storage userStaking = stakingInfo[msg.sender];
        userStaking.stakedAmount = userStaking.stakedAmount.add(amount);
        userStaking.stakingTimestamp = block.timestamp;
        userStaking.lastRewardClaim = block.timestamp;
        
        // Update total staked
        totalStaked = totalStaked.add(amount);
        
        // Update voting power
        _updateVotingPower(msg.sender, userStaking.stakedAmount);
        
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens and claim rewards
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external whenNotPaused {
        StakingInfo storage userStaking = stakingInfo[msg.sender];
        require(userStaking.stakedAmount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= userStaking.stakingTimestamp.add(minimumStakingPeriod),
            "Minimum staking period not met"
        );
        
        // Claim pending rewards
        _claimRewards(msg.sender);
        
        // Update staking info
        userStaking.stakedAmount = userStaking.stakedAmount.sub(amount);
        totalStaked = totalStaked.sub(amount);
        
        // Update voting power
        _updateVotingPower(msg.sender, userStaking.stakedAmount);
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external whenNotPaused {
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to claim rewards
     * @param user User address
     */
    function _claimRewards(address user) internal {
        StakingInfo storage userStaking = stakingInfo[user];
        require(userStaking.stakedAmount > 0, "No staked tokens");
        
        uint256 rewards = calculateRewards(user);
        if (rewards > 0) {
            userStaking.accumulatedRewards = userStaking.accumulatedRewards.add(rewards);
            userStaking.lastRewardClaim = block.timestamp;
            
            // Mint rewards if within max supply
            if (totalSupply().add(rewards) <= MAX_SUPPLY) {
                _mint(user, rewards);
                emit RewardsClaimed(user, rewards);
            }
        }
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user User address
     * @return Pending reward amount
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakingInfo storage userStaking = stakingInfo[user];
        if (userStaking.stakedAmount == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp.sub(userStaking.lastRewardClaim);
        uint256 annualReward = userStaking.stakedAmount.mul(stakingRewardRate).div(100);
        uint256 rewards = annualReward.mul(stakingDuration).div(SECONDS_PER_YEAR);
        
        return rewards;
    }

    /**
     * @dev Update voting power for governance
     * @param user User address
     * @param stakedAmount New staked amount
     */
    function _updateVotingPower(address user, uint256 stakedAmount) internal {
        uint256 oldVotingPower = votingPower[user];
        uint256 newVotingPower = stakedAmount; // 1:1 ratio for simplicity
        
        votingPower[user] = newVotingPower;
        totalVotingPower = totalVotingPower.sub(oldVotingPower).add(newVotingPower);
        
        emit VotingPowerUpdated(user, newVotingPower);
    }

    /**
     * @dev Update staking reward rate (only owner)
     * @param newRate New annual reward rate (percentage)
     */
    function updateStakingRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 20, "Reward rate too high"); // Max 20% annual
        stakingRewardRate = newRate;
        emit StakingRewardRateUpdated(newRate);
    }

    /**
     * @dev Update minimum staking period (only owner)
     * @param newPeriod New minimum staking period in seconds
     */
    function updateMinimumStakingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod <= 30 days, "Period too long");
        minimumStakingPeriod = newPeriod;
    }

    /**
     * @dev Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get staking information for a user
     * @param user User address
     * @return Staking details
     */
    function getStakingInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 stakingTimestamp,
        uint256 lastRewardClaim,
        uint256 accumulatedRewards,
        uint256 pendingRewards
    ) {
        StakingInfo storage userStaking = stakingInfo[user];
        return (
            userStaking.stakedAmount,
            userStaking.stakingTimestamp,
            userStaking.lastRewardClaim,
            userStaking.accumulatedRewards,
            calculateRewards(user)
        );
    }

    /**
     * @dev Get total staking statistics
     * @return Total staked amount and number of stakers
     */
    function getStakingStats() external view returns (
        uint256 totalStakedAmount,
        uint256 totalVotingPowerAmount,
        uint256 currentRewardRate
    ) {
        return (
            totalStaked,
            totalVotingPower,
            stakingRewardRate
        );
    }

    /**
     * @dev Override transfer to handle paused state
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     * In case of contract issues, owner can withdraw stuck tokens
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot withdraw native token");
        IERC20(token).transfer(owner(), amount);
    }

    /**
     * @dev Burn tokens from specific address (only owner)
     * For penalty mechanisms
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) public override {
        require(
            msg.sender == owner() || allowance(from, msg.sender) >= amount,
            "Burn amount exceeds allowance"
        );
        
        if (msg.sender != owner()) {
            uint256 currentAllowance = allowance(from, msg.sender);
            _approve(from, msg.sender, currentAllowance.sub(amount));
        }
        
        _burn(from, amount);
    }
}