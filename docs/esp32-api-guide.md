# ESP32 Attendance System API Guide

## Overview
This guide explains how to integrate your ESP32 device with the attendance system API. The API supports both fingerprint-based employee attendance and RFID-based member attendance.

## API Base URL
```
https://your-api-domain.com/api/trpc/esp32
```

## Authentication
Every request requires device credentials:
- `deviceId`: Your device's unique identifier
- `accessKey`: Your device's secret key

## HTTP Headers
```
Content-Type: application/json
```

## Endpoints

### 1. Device Authentication
Verify your device credentials before starting operations.

```cpp
// ESP32 Arduino Code
HTTPClient http;
StaticJsonDocument<200> doc;
doc["deviceId"] = "your_device_id";
doc["accessKey"] = "your_access_key";

String json;
serializeJson(doc, json);

http.begin("https://your-api-domain.com/api/trpc/esp32.authenticate");
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST(json);

if (httpCode == HTTP_CODE_OK) {
    // Authentication successful
}
```

### 2. Log Employee Fingerprint
Record employee attendance using fingerprint.

```cpp
// ESP32 Arduino Code
HTTPClient http;
StaticJsonDocument<200> doc;
doc["deviceId"] = "your_device_id";
doc["accessKey"] = "your_access_key";
doc["fingerId"] = fingerprint_id;  // ID from fingerprint sensor
doc["timestamp"] = getTimestamp();  // Current timestamp in ISO format

String json;
serializeJson(doc, json);

http.begin("https://your-api-domain.com/api/trpc/esp32.logFingerprint");
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST(json);

if (httpCode == HTTP_CODE_OK) {
    // Attendance logged successfully
}
```

### 3. Log Member RFID
Record member check-in using RFID card.

```cpp
// ESP32 Arduino Code
HTTPClient http;
StaticJsonDocument<200> doc;
doc["deviceId"] = "your_device_id";
doc["accessKey"] = "your_access_key";
doc["rfid"] = rfid_number;  // RFID card number
doc["timestamp"] = getTimestamp();  // Current timestamp in ISO format

String json;
serializeJson(doc, json);

http.begin("https://your-api-domain.com/api/trpc/esp32.logRFID");
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST(json);

if (httpCode == HTTP_CODE_OK) {
    // Member check-in logged successfully
}
```

### 4. Batch Upload (Offline Mode)
Upload multiple attendance records when reconnecting after offline operation.

```cpp
// ESP32 Arduino Code
HTTPClient http;
StaticJsonDocument<1024> doc;  // Larger document for array
doc["deviceId"] = "your_device_id";
doc["accessKey"] = "your_access_key";

JsonArray records = doc.createNestedArray("records");

// Add stored records from offline mode
JsonObject record1 = records.createNestedObject();
record1["type"] = "fingerprint";  // or "rfid"
record1["id"] = stored_id;
record1["timestamp"] = stored_timestamp;

String json;
serializeJson(doc, json);

http.begin("https://your-api-domain.com/api/trpc/esp32.bulkLog");
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST(json);
```

## Helper Functions

```cpp
String getTimestamp() {
    // Get timestamp from NTP server
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        char timestamp[25];
        strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
        return String(timestamp);
    }
    return "";
}
```

## Error Handling
Handle common HTTP response codes:
- 200: Success
- 401: Unauthorized (invalid device credentials)
- 404: Not found (invalid fingerprint/RFID)
- 500: Server error

```cpp
void handleResponse(int httpCode, String payload) {
    switch (httpCode) {
        case HTTP_CODE_OK:
            // Process success response
            break;
        case HTTP_CODE_UNAUTHORIZED:
            // Handle authentication error
            break;
        case HTTP_CODE_NOT_FOUND:
            // Handle invalid ID
            break;
        default:
            // Handle other errors
            break;
    }
}
```

## Best Practices
1. Implement offline storage for when network is unavailable
2. Add retry logic for failed requests
3. Use NTP to maintain accurate device time
4. Implement proper error handling and user feedback (LCD/LED)
5. Store credentials securely in ESP32 memory

## Required Libraries
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

## Complete Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";
const char* deviceId = "your_device_id";
const char* accessKey = "your_access_key";
const char* ntpServer = "pool.ntp.org";

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    // Init time
    configTime(0, 0, ntpServer);
}

void loop() {
    if (WiFi.status() == WL_CONNECTED) {
        // Handle fingerprint scan
        if (fingerprintDetected) {
            logFingerprint(fingerprintId);
        }
        
        // Handle RFID scan
        if (rfidDetected) {
            logRFID(rfidNumber);
        }
    } else {
        // Store offline records
        storeOfflineRecord();
    }
    
    delay(100);
}