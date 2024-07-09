pragma solidity ^0.8.25;

struct Score {
    uint256 score_loser;
    bytes32 loser;
    bytes32 winner;
    bool exists;
}

contract ManageScores {
    mapping(uint256 => Score) public scores;

    error GameIdAlreadyExist(uint256 game_id);
    error ScoreNotStored(uint256 game_id);

    function recordScore(uint256 game_id, uint256 score_loser, bytes32 loser, bytes32 winner) external {
        require(!scores[game_id].exists, "GameIdAlreadyExist");
        scores[game_id] = Score(score_loser, loser, winner, true);
    }

    function retrieveScore(uint256 game_id) external view returns(uint256, bytes32, bytes32) {
        Score memory score = scores[game_id];
        require(score.exists, "ScoreNotStored");
        return (score.score_loser, score.loser, score.winner);
    }
}