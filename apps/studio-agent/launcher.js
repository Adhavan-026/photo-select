const { execSync, exec } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('       Starting PhotoSelect Studio Agent Launcher  ');
console.log('==================================================\n');

try {
  // Check if Docker is running
  console.log('🐳 Verifying Docker connection...');
  execSync('docker info', { stdio: 'ignore' });
} catch (err) {
  console.error('\n❌ ERROR: Docker Desktop is not running!');
  console.log('Please start Docker Desktop on your computer and try again.');
  console.log('\nPress Enter to exit...');
  
  // Wait for user input before exiting
  try {
    execSync('pause', { stdio: 'inherit' });
  } catch (e) {}
  process.exit(1);
}

try {
  // Get directory where the .exe is running on the host
  const runDir = path.dirname(process.execPath);
  console.log(`📂 Working Directory: ${runDir}`);
  console.log('🚀 Starting background services (Docker containers)...');
  
  // Run docker compose up in the working directory
  execSync('docker compose up -d', { cwd: runDir, stdio: 'inherit' });
  
  console.log('\n🔌 Local Studio Agent Express server running on port 8080');
  console.log('🌎 Opening your Studio Dashboard...');
  
  // Open the website
  const url = 'https://photo-select-cloud-frontend.vercel.app/dashboard/studio';
  if (process.platform === 'win32') {
    exec(`start ${url}`);
  } else if (process.platform === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
  
  console.log('\n✅ PhotoSelect is running successfully!');
  console.log('You can minimize this window. Press Ctrl+C or close this window to exit.');
  
  // Keep process alive
  setInterval(() => {}, 1000);
} catch (err) {
  console.error('\n❌ Failed to start containers:', err.message);
  console.log('\nPress Enter to exit...');
  try {
    execSync('pause', { stdio: 'inherit' });
  } catch (e) {}
  process.exit(1);
}
