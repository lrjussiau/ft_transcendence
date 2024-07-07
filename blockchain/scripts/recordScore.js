const   { ethers } = require("ethers");
const   fs = require("fs");

(async () => {

        //const   provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);          
        //const   wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        //const   factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const   provider = new ethers.JsonRpcProvider("http://localhost:8545");
        const   signer = await provider.getSigner();

        const   contractAddress = JSON.parse(fs.readFileSync("/app/contractAdress.json"));
        const   abi = JSON.parse(fs.readFileSync("/app/contractABI.json"));

        const   contract = new ethers.Contract(contractAddress, abi, signer);
        //const   gameHash = ethers.encodeBytes32String(process.argv[2]);
        /*const   score = {
                score_loser : process.argv[3],
                loser : ethers.encodeBytes32String(process.argv[4]),
                winner : ethers.encodeBytes32String(process.argv[5]),
        };*/

        await   contract.recordScore(process.argv[2], process.argv[3], ethers.encodeBytes32String(process.argv[4]), ethers.encodeBytes32String(process.argv[5]));
        console.log("Game  score saved on the blocakchain");
})();