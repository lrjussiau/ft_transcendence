const   { ethers } = require("ethers");
const   fs = require("fs");

(async () => {

        const   provider = new ethers.JsonRpcProvider("http://localhost:8545");
        const   signer = await provider.getSigner();

        const   contractAddress = JSON.parse(fs.readFileSync("contractAdress.json"));
        const   abi = JSON.parse(fs.readFileSync("contractABI.json"));

        const   contract = new ethers.Contract(contractAddress, abi, signer);

        const   gameHash = ethers.encodeBytes32String(process.argv[2]);

        const   score = await contract.retrieveScore(gameHash);
        const decodedScore = {
        score_loser: Number(score.score_loser),
        score_winner: Number(score.score_winner),
        loser: ethers.decodeBytes32String(score.loser),
        winner: ethers.decodeBytes32String(score.winner)
    };

    console.log(JSON.stringify(decodedScore));
})();