pragma solidity ^0.8.25;

struct Score {
        uint8           score_loser;
        uint8           score_winner;
        bytes32         loser;
        bytes32         winner;
}

contract ManageScores{

        mapping(bytes32 => Score) scores;
        mapping(bytes32 => bool) public scoreExist;
        error   GameIdAlreadyExist(bytes32 game_id);
        error   ScoreNotStored(bytes32 game_id);

        function recordScore(bytes32 game_id, Score calldata game_score) external {
                if (scoreExist[game_id] == true){
                        revert GameIdAlreadyExist(game_id);
                }
                else{
                        scores[game_id] = game_score;
                        scoreExist[game_id] = true;
                }
        }

        function retrieveScore(bytes32 game_id) external view returns(Score memory) {
                if (scoreExist[game_id] == true){
                        return scores[game_id];
                }
                else{
                        revert ScoreNotStored(game_id);
                }
        }
}