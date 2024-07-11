const { ethers } = require("ethers");
const fs = require("fs");

async function main() {

        // const   provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);          
        // const   wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const   provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const   signer = await provider.getSigner();

        const   contractJSON = require("../out/ManageScores.sol/ManageScores.json");
        const   abi = contractJSON.abi;
        const   bytecode = contractJSON.bytecode;

        const   factory = new ethers.ContractFactory(abi, bytecode, signer);
        //const   factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const   contract = await factory.deploy();

        console.log("Contract deployed at:", contract.target);

        fs.writeFileSync("contractAdress.json", JSON.stringify(contract.target, null, 2));
        fs.writeFileSync("contractABI.json", JSON.stringify(abi, null, 2));

        console.log("Contract adress and ABI saved to files");
}

main()
        .then(() => process.exit(0))
        .catch((error) => {
                console.error(error);
                process.exit(1);
        });