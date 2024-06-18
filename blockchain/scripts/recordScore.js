const   { ethers } = require("ethers");
const   fs = require("fs");

(async () => {

        const   provider = new ethers.JsonRpcProvider("http://localhost:8545");
        const   signer = await provider.getSigner();

        const   contractAddress = JSON.parse(fs.readFileSync("/app/contractAdress.json"));
        const   abi = JSON.parse(fs.readFileSync("/app/contractABI.json"));

        const   contract = new ethers.Contract(contractAddress, abi, signer);
        const   gameHash = ethers.encodeBytes32String(process.argv[2]);
        const   score = {
                score_loser : process.argv[3],
                score_winner : process.argv[4],
                loser : ethers.encodeBytes32String(process.argv[5]),
                winner : ethers.encodeBytes32String(process.argv[6]),
        };

        await   contract.recordScore(gameHash, score);
        console.log("Game  score saved on the blocakchain");
})();