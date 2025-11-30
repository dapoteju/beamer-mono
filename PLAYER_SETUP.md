# Beamer Player Setup Guide

This document provides step-by-step instructions for the operations team to set up and configure Beamer Player devices.

## Overview

The Beamer Player is the client-side application that runs on digital signage devices. It:
- Connects to the Beamer backend API
- Fetches and displays advertising content (images/videos)
- Reports playback events with GPS location
- Sends heartbeats with device health metrics

## Prerequisites

### Supported Operating Systems
- Ubuntu 22.04 LTS (recommended for production)
- Windows 10/11
- macOS (for development/testing)

### Required Software
1. **Node.js LTS** (v20.x or later)
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

   # Windows: Download from https://nodejs.org/
   ```

2. **Git**
   ```bash
   # Ubuntu/Debian
   sudo apt install git

   # Windows: Download from https://git-scm.com/
   ```

3. **Display/GPU drivers** (for video playback)

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/dapoteju/beamer-mono
cd beamer-mono
```

### Step 2: Install Dependencies

```bash
# Navigate to player-electron folder (from beamer-mono root)
cd player-electron

# Install dependencies
npm install

# Go back to repo root
cd ..
```

### Step 3: Build Player Core (if needed)

```bash
# From beamer-mono root
cd player-core
npm install
npm run build

# Go back to repo root
cd ..
```

## Configuration

### Create beamer.config.json

In the `player-electron` folder, create a file named `beamer.config.json`:

```json
{
  "api_base_url": "https://your-beamer-backend.replit.app/api",
  "serial_number": "HW-000123",
  "screen_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "provisioning_code": "ABC123"
}
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `api_base_url` | Yes | The Beamer backend API URL. Get this from your IT team. Should end with `/api`. |
| `serial_number` | Yes | Unique hardware identifier. Use the device serial number or asset tag. |
| `screen_id` | Yes | The Screen UUID from the Beamer CMS. Find this in CMS > Screens > [Screen Name] > Details. |
| `provisioning_code` | No | Optional one-time security code generated in CMS (for future use). |

### How to Find Your Screen ID

1. Log into the Beamer CMS at your company's URL
2. Navigate to **Screens** in the sidebar
3. Click on the screen you're setting up
4. Copy the **Screen ID** from the details panel (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Enabling GPS Location (macOS)

For the player to report accurate GPS coordinates, you must grant Location Services permission to the Electron app.

### Step 1: Enable Location Services

1. Open **System Preferences** (or **System Settings** on macOS Ventura+)
2. Go to **Security & Privacy** > **Privacy** tab
3. Select **Location Services** in the left sidebar
4. Check the box to enable Location Services (if not already enabled)

### Step 2: Grant Permission to Electron

1. In the Location Services list, look for **Electron** (or the app name if packaged)
2. Check the box next to it to allow location access
3. If Electron isn't listed, run the player once - it should appear after requesting permission

### Step 3: Verify Location Access

When you start the player, you should see the actual device coordinates in the logs:

```
GPS location: { lat: 51.5074, lng: -0.1278, accuracy_m: 10 }
```

**Troubleshooting:**

- If coordinates show as Nigeria (~6.44, ~3.48), the player is using fallback mock data because it can't access real GPS
- On macOS, ensure the app has permission in System Preferences
- In development, you may need to restart the Electron app after granting permissions
- Some corporate networks/VPNs may block geolocation services

### Windows Location Settings

1. Go to **Settings** > **Privacy** > **Location**
2. Enable **Allow apps to access your location**
3. Scroll down and enable location for **Desktop apps**

### Linux Location Settings

On Linux, geolocation typically requires the GeoClue service:

```bash
# Ubuntu/Debian
sudo apt install geoclue-2.0
```

## Running the Player

### Start the Player

```bash
# From beamer-mono root
cd player-electron
npm start
```

### What Happens on First Run

1. **Config Load**: Player reads `beamer.config.json`
2. **Registration**: Player registers with backend using serial_number and screen_id
3. **Auth Token**: Backend returns an auth token, saved to `player.json`
4. **Playlist Fetch**: Player downloads the current playlist
5. **Playback**: Content starts playing in fullscreen

### Subsequent Runs

After initial registration, `player.json` contains the auth token. The player will:
- Skip registration
- Fetch latest playlist
- Resume playback
- Send heartbeats every 60 seconds (with GPS + device metrics)
- Report each creative play event

## Re-Registering a Player (Reconnecting to a Screen)

If a player was previously connected to a screen but now shows as "offline" or "no player connected" in the CMS, you'll need to re-register the player. This commonly happens when:
- The player was disconnected via the CMS
- The player's credentials were revoked
- You're setting up a new device to replace an old one

### Step 1: Disconnect Old Player (If Needed)

If the CMS shows another player is still linked to the screen, you'll need to disconnect it first.

**For Internal/Admin Users:**
1. Log into the Beamer CMS with admin credentials
2. Navigate to **Screens** > select your screen
3. Click **Disconnect Player** button
4. Confirm the disconnection

**For Field Operations Team:**
If you don't have access to the disconnect function, contact your Beamer administrator or IT support to disconnect the old player before proceeding.

This marks the old player as inactive so a new one can register.

### Step 2: Delete player.json on the Device

On the player device, delete the `player.json` file to clear old credentials:

```bash
# macOS / Linux
cd player-electron
rm player.json

# Windows (PowerShell)
cd player-electron
Remove-Item player.json
```

**Important**: Keep `beamer.config.json` intact - this contains your screen configuration.

### Step 3: Restart the Player

```bash
npm start
```

The player will:
1. Detect that `player.json` is missing
2. Register as a new player with the backend
3. Receive fresh credentials (new player_id and auth_token)
4. Save the new credentials to `player.json`
5. Begin sending heartbeats and playing content

### Step 4: Verify in CMS

1. Wait 1-2 minutes for heartbeats to arrive
2. Check the screen in CMS - it should show:
   - Player connected
   - Status: Online (green indicator)
   - Last heartbeat timestamp

## Auto-Start on Boot (Linux)

### Using systemd

1. Create a service file:

```bash
sudo nano /etc/systemd/system/beamer-player.service
```

2. Add this content:

```ini
[Unit]
Description=Beamer Player
After=network.target graphical.target

[Service]
Type=simple
User=<YOUR_USER>
WorkingDirectory=/opt/beamer-mono/player-electron
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable beamer-player
sudo systemctl start beamer-player
```

4. Check status:

```bash
sudo systemctl status beamer-player
journalctl -u beamer-player -f  # View logs
```

### Using pm2 (Alternative)

```bash
# Install pm2
npm install -g pm2

# Start the player
cd /opt/beamer-mono/player-electron
pm2 start npm --name "beamer-player" -- start

# Save configuration
pm2 save
pm2 startup
```

## Troubleshooting

### Player Shows Offline in CMS (But Device is Running)

**Understanding Online/Offline Status:**

The CMS determines if a player is "online" based on heartbeats. A player is considered online if:
- It has sent a heartbeat within the last **2 minutes**
- The player is marked as **active** (not disconnected/revoked)

**Common Causes:**

1. **Network Issues**: The player can't reach the backend API
2. **Inactive Player**: The player was disconnected via CMS but is still running with old credentials
3. **Wrong API URL**: The player is sending heartbeats to the wrong server
4. **Firewall/Proxy**: Corporate network blocking outbound requests

**Diagnosis Steps:**

1. **Check player logs** for errors:
   ```bash
   # Look for heartbeat errors in console output
   npm start 2>&1 | grep -i "heartbeat\|error"
   ```

2. **Verify network connectivity**:
   ```bash
   curl -I https://your-beamer-backend.replit.app/api/health
   ```

3. **Check if player.json exists and has valid credentials**:
   ```bash
   cat player.json
   ```

**Fixes:**

- If network is fine but still offline: Delete `player.json` and restart (see "Re-Registering a Player" above)
- If player.json is missing: The player should auto-register on next start
- If API URL is wrong: Update `beamer.config.json` with correct URL

### Error: "PLAYER_ALREADY_REGISTERED" / "Screen already linked to another player"

**What This Means:**

When a player tries to register, the backend checks if the screen already has an active player. If so, it blocks the registration to prevent duplicate players.

**When This Happens:**
- Reinstalling the player app without disconnecting in CMS first
- Setting up a replacement device for an existing screen
- The `player.json` file was deleted but the old player wasn't disconnected

**Solution:**

1. **Disconnect the old player via CMS** (requires admin access):
   - Go to **Screens** > select your screen
   - Click **Disconnect Player**
   - This marks the old player as inactive
   - *If you don't have admin access, contact your Beamer administrator*

2. **On the device:**
   - Delete `player.json` if it exists
   - Restart the player app

3. **The player will register successfully** and receive new credentials

**Technical Note:** The backend returns error code `PLAYER_ALREADY_REGISTERED` with the existing player ID. This is intentional to prevent ghost players.

### Error: "Missing beamer.config.json"

**Cause**: The config file doesn't exist in the working directory.

**Fix**: Create `beamer.config.json` in the `player-electron` folder with proper values.

### Error: "Invalid beamer.config.json"

**Cause**: Required fields are missing or empty.

**Fix**: Ensure `api_base_url`, `serial_number`, and `screen_id` are all present and not empty.

### Error: "Failed to register player"

**Causes**:
- Wrong `api_base_url` (check URL is correct and accessible)
- Invalid `screen_id` (screen doesn't exist in CMS)
- Network connectivity issues

**Fix**: 
1. Verify network connection: `ping your-beamer-backend.replit.app`
2. Confirm screen exists in CMS
3. Check the screen_id matches exactly

### No Content Playing

**Causes**:
- No flights scheduled for this screen
- Playlist is empty
- Creative files not yet approved

**Fix**: 
1. Log into CMS and verify screen has active flights
2. Check if creatives are approved for the screen's region
3. Review player logs for errors

### Heartbeats/Playbacks Not Appearing in CMS

**Causes**:
- Network issues
- Wrong API URL
- Auth token expired (rare)

**Fix**:
1. Check network connectivity
2. Verify `api_base_url` is correct
3. Delete `player.json` and restart to re-register

### Logs Location

- **Console logs**: Visible in terminal when running `npm start`
- **systemd logs**: `journalctl -u beamer-player -f`
- **pm2 logs**: `pm2 logs beamer-player`

## Files Reference

| File | Purpose |
|------|---------|
| `beamer.config.json` | Device configuration (you create this) |
| `player.json` | Registration data + auth token (auto-created) |
| `playlist.json` | Current playlist cache (auto-created) |

## Support

For issues not covered in this guide:
1. Check the player logs for error messages
2. Verify all configuration values
3. Contact your IT support team

---

**Version**: 1.1.0  
**Last Updated**: November 2025
