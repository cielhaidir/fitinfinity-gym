#include <FitInfinityAPI.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <NfcAdapter.h>

// WiFi credentials
const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";

// Device configuration
const char* baseUrl = "https://your-fitinfinity-domain.com";
const char* deviceId = "your-device-id";
const char* accessKey = "your-access-key";

// Fingerprint sensor pins
const int FINGER_RX = 16;  // GPIO16 -> sensor TX
const int FINGER_TX = 17;  // GPIO17 -> sensor RX
const int SD_CS_PIN = 5;   // SD card CS pin

// Initialize components
HardwareSerial fingerSerial(2);
PN532_I2C pn532_i2c(Wire);
PN532 nfc(pn532_i2c);
FitInfinityAPI api(baseUrl, deviceId, accessKey);

void setup() {
  Serial.begin(115200);
  Serial.println("\nFitInfinity Complete System Example");
  
  // Initialize I2C and RFID
  Wire.begin();
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("Didn't find PN532 board");
    while (1); // halt
  }
  
  Serial.print("Found chip PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
  Serial.print("Firmware ver. "); Serial.print((versiondata>>16) & 0xFF, DEC); 
  Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);
  
  // Configure PN532 to read RFID tags
  nfc.SAMConfig();
  
  fingerSerial.begin(57600, SERIAL_8N1, FINGER_RX, FINGER_TX);
  // Connect to WiFi and initialize API
  if (api.begin(ssid, password, SD_CS_PIN)) {
    Serial.println("Connected to WiFi and API!");
  } else {
    Serial.println("Failed to connect: " + api.getLastError());
  }
  
  // Initialize fingerprint sensor
  if (api.beginFingerprint(&fingerSerial)) {
    Serial.println("Fingerprint sensor initialized");
  } else {
    Serial.println("Fingerprint sensor error: " + api.getLastError());
  }
}

void loop() {
  // Check for pending enrollments
  DynamicJsonDocument doc(1024);
  JsonArray enrollments = doc.to<JsonArray>();
  
  if (api.getPendingEnrollments(enrollments)) {
    for (JsonObject enrollment : enrollments) {
      const char* id = enrollment["id"];
      const char* nama = enrollment["nama"];
      int fingerId = enrollment["finger_id"].as<int>();
      
      // Show enrollment instructions
      Serial.println("\nNew enrollment request:");
      Serial.printf("Name: %s (ID: %s)\n", nama, id);
      Serial.println("Place finger on sensor...");
      
      // Perform enrollment
      bool success = api.enrollFingerprint(fingerId);
      if (success) {
        Serial.printf("Successfully enrolled fingerprint for %s\n", nama);
        api.updateEnrollmentStatus(id, fingerId, true);
      } else {
        Serial.printf("Failed to enroll: %s\n", api.getLastError());
        api.updateEnrollmentStatus(id, fingerId, false);
      }
    }
  }
  
  // Regular attendance monitoring
  if (api.isConnected()) {
    // Check for fingerprint
    int fingerprintId = -1;
    uint8_t result = api.scanFingerprint(&fingerprintId);
    
    if (result == FINGERPRINT_OK && fingerprintId >= 0) {
      if (api.logFingerprint(fingerprintId)) {
        Serial.println("Fingerprint attendance logged successfully!");
      } else {
        Serial.println("Failed to log fingerprint attendance: " + api.getLastError());
      }
      delay(2000);  // Prevent multiple scans
    }
    
    // Check for RFID card
    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;
    
    if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
      // Convert UID to hex string
      String rfidTag = "";
      for (uint8_t i = 0; i < uidLength; i++) {
        if (uid[i] < 0x10) {
          rfidTag += "0";
        }
        rfidTag += String(uid[i], HEX);
      }
      rfidTag.toUpperCase();
      
      // Log the RFID attendance
      Serial.print("Found RFID card: "); Serial.println(rfidTag);
      if (api.logRFID(rfidTag.c_str())) {
        Serial.println("RFID attendance logged successfully!");
      } else {
        Serial.println("Failed to log RFID attendance: " + api.getLastError());
      }
      
      delay(2000); // Prevent multiple scans of the same card
    }
    
    // Sync any offline records
    api.syncOfflineRecords();
  }
  
  delay(100);  // Small delay to prevent tight looping
}