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

**Version**: 1.0.0  
**Last Updated**: November 2025
