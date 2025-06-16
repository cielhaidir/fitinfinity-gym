# ESP32 Attendance System API Guide

## Overview
This guide explains how to integrate your ESP32 device with the attendance system API. The API supports both fingerprint-based employee attendance and RFID-based member attendance.

## API Base URL
```
https://your-api-domain.com/api/esp32
```

## Authentication
Every request requires device credentials:
- `deviceId`: Your device's unique identifier
- `accessKey`: Your device's secret key

## HTTP Headers
```
Content-Type: application/json
```

## REST API Endpoints

### 1. Device Authentication
**POST /api/esp32**
Verify your device credentials.

Request body:
```json
{
  "action": "authenticate",
  "deviceId": "your_device_id",
  "accessKey": "your_access_key"
}
```

Response:
```json
{
  "authenticated": true,
  "message": "Device authenticated successfully"
}
```

### 2. Log Employee Fingerprint
**POST /api/esp32**
Record employee attendance using fingerprint.

Request body:
```json
{
  "action": "logFingerprint",
  "deviceId": "your_device_id",
  "accessKey": "your_access_key",
  "fingerId": 123,
  "timestamp": "2025-06-14T06:40:00.000Z"
}
```

Response:
```json
{
  "id": "attendance_id",
  "checkIn": "2025-06-14T06:40:00.000Z",
  "deviceId": "your_device_id"
}
```

### 3. Log Member RFID
**POST /api/esp32**
Record member check-in using RFID card.

Request body:
```json
{
  "action": "logRFID",
  "deviceId": "your_device_id", 
  "accessKey": "your_access_key",
  "rfid": "rfid_number",
  "timestamp": "2025-06-14T06:40:00.000Z"
}
```

Response:
```json
{
  "success": true,
  "message": "Member attendance logged successfully",
  "data": {
    "id": "attendance_id",
    "checkin": "2025-06-14T06:40:00.000Z"
  }
}
```

### 4. Get Pending Enrollments
**GET /api/esp32?deviceId=your_device_id&accessKey=your_access_key**
Get list of pending fingerprint enrollments.

Response:
```json
{
  "id": "employee_id",
  "name": "Employee Name"
}
```

Or if no pending enrollments:
```json
{
  "status": "none"
}
```

### 5. Request Enrollment
**POST /api/esp32**
Request new fingerprint enrollment.

Request body:
```json
{
  "action": "requestEnrollment",
  "deviceId": "your_device_id",
  "accessKey": "your_access_key",
  "employeeId": "employee_id"
}
```

Response:
```json
{
  "success": true,
  "message": "Enrollment request initiated"
}
```

### 6. Update Enrollment Status
**POST /api/esp32**
Update enrollment status after capturing fingerprint.

Request body:
```json
{
  "action": "updateEnrollmentStatus",
  "deviceId": "your_device_id",
  "accessKey": "your_access_key",
  "employeeId": "employee_id",
  "fingerprintId": 123,
  "status": "ENROLLED"
}
```

Response:
```json
{
  "success": true,
  "message": "Enrollment enrolled"
}
```

### 7. Bulk Log
**POST /api/esp32**
Upload multiple attendance records.

Request body:
```json
{
  "action": "bulkLog",
  "logs": [
    {
      "type": "fingerprint",
      "id": 123,
      "timestamp": "2025-06-14T06:40:00.000Z",
      "deviceId": "your_device_id",
      "accessKey": "your_access_key"
    },
    {
      "type": "rfid",
      "id": "rfid_number",
      "timestamp": "2025-06-14T06:41:00.000Z", 
      "deviceId": "your_device_id",
      "accessKey": "your_access_key"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "message": "Check-in recorded for fingerprint 123"
    },
    {
      "success": true, 
      "message": "Check-in recorded for RFID rfid_number"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid action"
}
```

### 401 Unauthorized
```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid device credentials"
}
```

### 404 Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "Employee not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Best Practices
1. Always include deviceId and accessKey in requests
2. Handle error responses appropriately
3. Use proper error handling and retry logic
4. Include request timeouts
5. Store failed requests for retry when offline

## Sample ESP32 Code for REST API

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* API_URL = "https://your-api-domain.com/api/esp32";
const char* DEVICE_ID = "your_device_id";
const char* ACCESS_KEY = "your_access_key";

// Log fingerprint attendance
void logFingerprint(int fingerId) {
  HTTPClient http;
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["action"] = "logFingerprint";
  doc["deviceId"] = DEVICE_ID;
  doc["accessKey"] = ACCESS_KEY;
  doc["fingerId"] = fingerId;
  doc["timestamp"] = getTimestamp();

  String jsonString;
  serializeJson(doc, jsonString);

  // Send POST request
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}

// Log RFID attendance
void logRFID(String rfidNumber) {
  HTTPClient http;
  
  StaticJsonDocument<200> doc;
  doc["action"] = "logRFID";
  doc["deviceId"] = DEVICE_ID;
  doc["accessKey"] = ACCESS_KEY;
  doc["rfid"] = rfidNumber;
  doc["timestamp"] = getTimestamp();

  String jsonString;
  serializeJson(doc, jsonString);

  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}

// Check for pending enrollments
void checkPendingEnrollments() {
  HTTPClient http;
  String url = String(API_URL) + "?deviceId=" + DEVICE_ID + "&accessKey=" + ACCESS_KEY;
  
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}