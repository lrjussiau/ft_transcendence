const { ethers } = require("ethers");
const fs = require("fs");

(async () => {
    try {
        // const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);          
        // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const provider = new ethers.JsonRpcProvider("http://localhost:8545");
        const signer = await provider.getSigner();

        const contractAddress = JSON.parse(fs.readFileSync("/app/contractAdress.json"));
        const abi = JSON.parse(fs.readFileSync("/app/contractABI.json"));

        // const contract = new ethers.Contract(contractAddress, abi, wallet);
        const contract = new ethers.Contract(contractAddress, abi, signer);

        const gameId = process.argv[2];
        console.log(`Retrieving score for game ID: ${gameId}`);

        const score = await contract.retrieveScore(gameId);
        console.log("Raw score:", score);

        const decodedScore = {
            score_loser: Number(score[0]),
            loser: ethers.decodeBytes32String(score[1]).replace(/\0+$/, ''),
            winner: ethers.decodeBytes32String(score[2]).replace(/\0+$/, '')
        };

        console.log("Decoded score:", JSON.stringify(decodedScore));
    } catch (error) {
        console.error("Error:", error.message);
    }
})();