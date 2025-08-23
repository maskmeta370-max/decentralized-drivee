async function main() {
  // Get the contract factory
  const FileManager = await hre.ethers.getContractFactory("FileManager");

  // Start the deployment
  console.log("Deploying FileManager contract...");
  const fileManager = await FileManager.deploy();

  // Wait for the deployment to be confirmed
  await fileManager.waitForDeployment();

  // Print the contract address
  console.log(`FileManager contract deployed to: ${fileManager.target}`);
}

// Run the deployment and handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});