# 🧠 AI-Powered Burnout Detection System

An end-to-end multi-platform application designed to monitor wellness, track sleep & stress indicators, and provide AI-driven burnout predictions and personalized recommendations.

## 🏗️ Project Architecture
1. **Backend** (`/backend`): FastAPI (Python 3.10+) REST API with ML & AI recommendation logic.
2. **Web Frontend** (`/web`): React + Vite Single Page Application dashboard.
3. **Mobile App** (`/mobile`): React Native (Expo SDK 54) mobile application (Android & Web support).

---

## 📋 Step-by-Step Setup for a New Machine / Laptop

Follow this guide to get the entire project running from scratch on any new computer.

### Step 1: Install Required Prerequisites
Ensure the following tools are installed on your new system:
- **Node.js** (`v18.0.0` or higher) — [Download Node.js](https://nodejs.org/)
- **Python** (`v3.10` or higher) — [Download Python](https://www.python.org/)
- **JDK 17** (Microsoft OpenJDK 17 or Eclipse Temurin 17) — *Required for building Android native code*
- **Android Studio** — *Install Android SDK, Build-Tools, and Platform-Tools*

---

### Step 2: Configure Environment Variables & SDK Paths

#### 2.1 Locating Your Android SDK Directory
Depending on your OS, Android SDK is usually located at:
- **Windows**: `C:\Users\<Your-Username>\AppData\Local\Android\Sdk`
- **macOS**: `/Users/<Your-Username>/Library/Android/sdk`
- **Linux**: `/home/<Your-Username>/Android/Sdk`

#### 2.2 Create `local.properties` File
Inside the `mobile/android/` directory, create a file named `local.properties` and add your SDK path (use **forward slashes `/`**):

```properties
sdk.dir=C:/Users/YourUsername/AppData/Local/Android/Sdk
```

#### 2.3 Set Windows Environment Variables
Open **PowerShell as Administrator** on the new laptop and run:

```powershell
# 1. Set JAVA_HOME (replace path with your installed JDK 17 folder)
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot", "User")

# 2. Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\<YourUsername>\AppData\Local\Android\Sdk", "User")

# 3. Add JDK & ADB to user PATH
$oldPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$oldPath;C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot\bin;C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools"
[System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```
> ⚠️ **Important**: Close and reopen your terminal after running this command so the new environment variables take effect!

---

## 🚀 Running the Services

### 1. 🐍 Running the Backend (FastAPI)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 3. Install required Python packages
pip install -r requirements.txt

# 4. Start the FastAPI server
python main.py
```
- **Backend API URL**: `http://localhost:8000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

### 2. 💻 Running the Web Frontend (React + Vite)

```bash
# 1. Navigate to the web directory
cd web

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev
```
- Open your browser at `http://localhost:3000` (or `http://localhost:5173`)

---

### 3. 📱 Running the Mobile App (React Native / Expo)

```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install dependencies
npm install
```

#### Running on Connected Physical Android Device:
1. Connect your Android phone via USB and enable **USB Debugging**.
2. Run port forwarding so the mobile app on USB can reach the local backend:
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```
3. Compile and launch the app on your phone:
   ```bash
   npm run android
   ```

#### Running on Web Browser:
```bash
npm run web
```
- Opens the React Native app in your browser at `http://localhost:8081`.

---

## 🔧 Build & Configuration Notes

- **Android Architecture**: The app is configured to build `arm64-v8a` for 64-bit devices in `mobile/android/app/build.gradle` for faster compilation.
- **Expo Autolinking Patch**: If `ExpoFetchModule` package errors occur during Android build, verify `mobile/node_modules/expo/expo-module.config.json` has `android.modules: []`.
- **Stale Daemons**: If Gradle locks files during build, run `.\gradlew.bat --stop` inside `mobile/android/`.
