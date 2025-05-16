// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DailyQuiz
 * @dev Stores a daily quiz (array of question IDs or hashes), updatable only once per day.
 *      Designed for use with a frontend that fetches the daily quiz from the contract.
 */
contract DailyQuiz {
    address public owner;
    uint256 public lastUpdateDay;
    uint256 public lastUpdateTimestamp;
    bytes32[] public currentQuiz; // Array of question IDs or hashes

    event QuizUpdated(bytes32[] quiz, uint256 timestamp, uint256 day);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can update quiz");
        _;
    }

    constructor() {
        owner = msg.sender;
        lastUpdateDay = getDay(block.timestamp);
    }

    /// @notice Update the daily quiz (can only be called once per day)
    /// @param quiz Array of question IDs or hashes (length should be 5)
    function updateQuiz(bytes32[] calldata quiz) external onlyOwner {
        uint256 today = getDay(block.timestamp);
        require(today > lastUpdateDay, "Quiz already updated today");
        require(quiz.length == 5, "Quiz must have 5 questions");
        currentQuiz = quiz;
        lastUpdateDay = today;
        lastUpdateTimestamp = block.timestamp;
        emit QuizUpdated(quiz, block.timestamp, today);
    }

    /// @notice Get the current quiz (question IDs or hashes)
    function getQuiz() external view returns (bytes32[] memory) {
        return currentQuiz;
    }

    /// @notice Returns the current day number since epoch (UTC)
    function getDay(uint256 timestamp) public pure returns (uint256) {
        return timestamp / 1 days;
    }
}
