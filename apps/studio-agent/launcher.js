const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('==================================================');
console.log('       Studioz Local Engine Controller        ');
console.log('==================================================\n');

try {
  // Check if Docker is running
  console.log('🐳 Verifying Docker connection...');
  execSync('docker info', { stdio: 'ignore' });
} catch (err) {
  console.error('\n❌ ERROR: Docker Desktop is not running!');
  console.log('Please start Docker Desktop on your computer and try again.');
  console.log('\nPress Enter to exit...');
  try {
    execSync('pause', { stdio: 'inherit' });
  } catch (e) {}
  process.exit(1);
}

try {
  // Get directory where the .exe is running on the host
  const runDir = path.dirname(process.execPath);
  console.log(`📂 Working Directory: ${runDir}`);
  console.log('🚀 Starting Studioz Sync Engine...');
  
  // Run docker compose up in the working directory
  execSync('docker compose up -d', { cwd: runDir, stdio: 'inherit' });
  
  console.log('\n🔌 Local Studio Agent Express server running on port 8082');
  console.log('🖥️ Opening Engine Health & Status Dashboard...');
  
  const localUrl = 'http://localhost:8082';
  
  // Launch in standalone borderless desktop app mode if Chrome or Edge is installed
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  let launched = false;
  if (process.platform === 'win32') {
    // Try Chrome
    for (const cPath of chromePaths) {
      if (fs.existsSync(cPath)) {
        exec(`"${cPath}" --app=${localUrl}`);
        launched = true;
        break;
      }
    }
    
    // Try Edge
    if (!launched && fs.existsSync(edgePath)) {
      exec(`"${edgePath}" --app=${localUrl}`);
      launched = true;
    }
  }
  
  // Fallback to normal browser if not win32 or no app mode browser found
  if (!launched) {
    if (process.platform === 'win32') {
      exec(`start ${localUrl}`);
    } else if (process.platform === 'darwin') {
      exec(`open ${localUrl}`);
    } else {
      exec(`xdg-open ${localUrl}`);
    }
  }
  
  console.log('\n✅ PhotoSelect Engine is active!');
  console.log('Keep this console window open to maintain engine runtime.');
  console.log('Press Ctrl+C or close this window to stop the engine.');
  
  // Keep process alive
  setInterval(() => {}, 1000);
} catch (err) {
  console.error('\n❌ Failed to start engine:', err.message);
  console.log('\nPress Enter to exit...');
  try {
    execSync('pause', { stdio: 'inherit' });
  } catch (e) {}
  process.exit(1);
}
