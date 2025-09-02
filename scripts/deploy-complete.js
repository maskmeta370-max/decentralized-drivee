async function main() {
  try {
    console.log("Starting complete deployment...");
    
    // Deploy StorageToken first
    console.log("\n1. Deploying StorageToken...");
    const StorageToken = await ethers.getContractFactory("StorageToken");
    const storageToken = await StorageToken.deploy();
    await storageToken.waitForDeployment();
    console.log(`StorageToken deployed to: ${storageToken.target}`);
    
    // Deploy FileManager with StorageToken address
    console.log("\n2. Deploying DecentralizedStorageManager...");
    const FileManager = await ethers.getContractFactory("DecentralizedStorageManager");
    const fileManager = await FileManager.deploy(storageToken.target);
    await fileManager.waitForDeployment();
    console.log(`DecentralizedStorageManager deployed to: ${fileManager.target}`);
    
    // Register a test storage provider
    console.log("\n3. Setting up test storage provider...");
    
    // First, mint some tokens for the deployer
    const [deployer] = await ethers.getSigners();
    const mintAmount = ethers.parseEther("10000"); // 10,000 tokens
    await storageToken.mint(deployer.address, mintAmount);
    console.log("Minted 10,000 tokens for deployer");
    
    // Approve FileManager to spend tokens for staking
    const stakeAmount = ethers.parseEther("1000"); // 1,000 tokens for staking
    await storageToken.approve(fileManager.target, stakeAmount);
    console.log("Approved FileManager to spend tokens");
    
    // Register as storage provider
    const totalStorage = ethers.parseEther("1000000000"); // 1GB in bytes
    const pricePerGB = ethers.parseEther("1"); // 1 token per GB per day
    await fileManager.registerProvider(
      totalStorage,
      pricePerGB,
      "test-node-id",
      "test-region"
    );
    console.log("Registered test storage provider");
    
    // Verify setup
    const totalProviders = await fileManager.getTotalProviders();
    console.log(`Total providers registered: ${totalProviders}`);
    
    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log(`StorageToken: ${storageToken.target}`);
    console.log(`FileManager: ${fileManager.target}`);
    console.log("\nUpdate your .env.local file:");
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${fileManager.target}`);
    console.log(`NEXT_PUBLIC_STORAGE_TOKEN_ADDRESS=${storageToken.target}`);
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});