const fs = require('fs');
const path = require('path');
const os = require('os');

const androidDir = path.join(__dirname, '..', 'android');
const propertiesPath = path.join(androidDir, 'local.properties');

// Helper to check if a directory exists and looks like an Android SDK
function isValidSdk(sdkPath) {
  if (!sdkPath) return false;
  try {
    return fs.existsSync(sdkPath) && (
      fs.existsSync(path.join(sdkPath, 'platform-tools')) ||
      fs.existsSync(path.join(sdkPath, 'platforms'))
    );
  } catch (e) {
    return false;
  }
}

function findAndroidSdk() {
  // 1. Check environment variables
  const envPaths = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT
  ];

  for (const envPath of envPaths) {
    if (isValidSdk(envPath)) {
      console.log(`[SDK Setup] Found Android SDK via environment variable: ${envPath}`);
      return envPath;
    }
  }

  // 2. Check default OS-specific paths
  const home = os.homedir();
  const platform = os.platform();
  let defaultPaths = [];

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    defaultPaths = [
      path.join(localAppData, 'Android', 'Sdk'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Android', 'Android Studio', 'sdk')
    ];
  } else if (platform === 'darwin') {
    defaultPaths = [
      path.join(home, 'Library', 'Android', 'sdk')
    ];
  } else if (platform === 'linux') {
    defaultPaths = [
      path.join(home, 'Android', 'Sdk'),
      '/usr/lib/android-sdk',
      '/opt/android-sdk'
    ];
  }

  for (const p of defaultPaths) {
    if (isValidSdk(p)) {
      console.log(`[SDK Setup] Found Android SDK in default location: ${p}`);
      return p;
    }
  }

  return null;
}

function run() {
  // Ensure the android directory exists (in case they haven't run prebuild or generated native code)
  if (!fs.existsSync(androidDir)) {
    console.log('[SDK Setup] No android folder found. Skipping local.properties generation.');
    return;
  }

  let existingSdkPath = null;
  if (fs.existsSync(propertiesPath)) {
    const content = fs.readFileSync(propertiesPath, 'utf8');
    const match = content.match(/sdk\.dir\s*=\s*(.+)/);
    if (match) {
      existingSdkPath = match[1].trim().replace(/\\\\/g, '\\').replace(/\\/g, '/');
    }
  }

  // If existing path is valid, we don't overwrite it to avoid disturbing custom setups
  if (isValidSdk(existingSdkPath)) {
    console.log(`[SDK Setup] Existing sdk.dir in local.properties is valid: ${existingSdkPath}`);
    return;
  }

  console.log('[SDK Setup] local.properties sdk.dir is missing or invalid. Searching for Android SDK...');
  const sdkPath = findAndroidSdk();

  if (sdkPath) {
    // Format path for local.properties (forward slashes are safer for Gradle on Windows)
    const formattedPath = sdkPath.replace(/\\/g, '/');
    const content = `sdk.dir=${formattedPath}\n`;
    fs.writeFileSync(propertiesPath, content, 'utf8');
    console.log(`[SDK Setup] Successfully wrote local.properties with sdk.dir=${formattedPath}`);
  } else {
    console.warn('[SDK Setup] WARNING: Could not automatically locate Android SDK. Please ensure Android SDK is installed and ANDROID_HOME environment variable is set.');
  }
}

run();
