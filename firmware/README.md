# Firmware Directory

This directory contains ESP32 firmware files for Over-The-Air (OTA) updates.

## File Naming Convention

Firmware files should be named using the version number with `.bin` extension:
- `v1.0.0.bin`
- `v1.1.0.bin`
- `v2.0.0-beta.bin`

## Security Notes

- Only place trusted firmware files in this directory
- Firmware files are served via the `/api/ota/download/[version]` endpoint
- Version names are validated to prevent directory traversal attacks
- Consider implementing authentication for firmware downloads in production

## Usage

1. Place your compiled ESP32 firmware `.bin` file in this directory
2. Use the MQTT router to deploy firmware updates to devices
3. Devices will download firmware from `/api/ota/download/[version]`

## Example

```bash
# Place firmware file
cp compiled-firmware.bin firmware/v1.2.0.bin

# Deploy via API (example)
POST /api/trpc/mqtt.deployFirmware
{
  "deviceIds": ["ESP32_001", "ESP32_002"],
  "version": "v1.2.0",
  "firmwareFile": "base64-encoded-firmware",
  "releaseNotes": "Bug fixes and performance improvements"
}