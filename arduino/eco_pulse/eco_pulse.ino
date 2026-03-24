#include <WiFi.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WebServer.h>

// Sensor Pins
#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_PIN A0
#define LIGHT_PIN 5

// WiFi Credentials
const char* ssid = "Shahul Hameed-2.4G";
const char* password = "0567992340";

DHT dht(DHTPIN, DHTTYPE);
// Common I2C addresses are 0x27 or 0x3F. Trying 0x27 first.
LiquidCrystal_I2C lcd(0x27, 16, 2); 
WebServer server(80);

String line1 = "Ready", line2 = "Analyze Plant...";
unsigned long lastScroll = 0;
int scrollPos = 0;

void scrollDisplay(String l1, String l2) {
  lcd.setCursor(0, 0);
  if (l1.length() <= 16) {
    String p1 = l1 + "                ";
    lcd.print(p1.substring(0, 16));
  } else {
    String out1 = l1 + "   ";
    int p = scrollPos % out1.length();
    String disp = out1.substring(p) + out1.substring(0, p);
    while(disp.length() < 16) disp += " ";
    lcd.print(disp.substring(0, 16));
  }

  lcd.setCursor(0, 1);
  if (l2.length() <= 16) {
    String p2 = l2 + "                ";
    lcd.print(p2.substring(0, 16));
  } else {
    String out2 = l2 + "   ";
    int p = scrollPos % out2.length();
    String disp = out2.substring(p) + out2.substring(0, p);
    while(disp.length() < 16) disp += " ";
    lcd.print(disp.substring(0, 16));
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("EcoPulse Starting...");

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connecting");
  Serial.println("LCD OK.");
  
  Serial.println("Initializing DHT...");
  dht.begin();
  Serial.println("DHT OK.");

  pinMode(LIGHT_PIN, INPUT);
  pinMode(SOIL_PIN, INPUT);
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(1000);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("Attempt: " + String(retry));
    retry++;
  }

  if(WiFi.status() == WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    delay(3000); // Show IP for 3 seconds
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    Serial.println("\nWiFi Failed (Retry limit reached)");
    delay(3000);
  }

  // Set the default messages for loop()
  line1 = "Ready";
  line2 = "Analyze Plant...";
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);

  server.on("/data", HTTP_GET, []() {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int soil_raw = analogRead(SOIL_PIN);
    int light_state = digitalRead(LIGHT_PIN); 

    String json = "{";
    json += "\"temperature\":" + String(isnan(t) ? 25.0 : t) + ",";
    json += "\"humidity\":" + String(isnan(h) ? 60.0 : h) + ",";
    json += "\"soil\":" + String(soil_raw) + ",";
    json += "\"light_percent\":" + String(light_state == LOW ? 100 : 0);
    json += "}";
    server.send(200, "application/json", json);
  });

  server.on("/lcd", HTTP_POST, []() {
    if (server.hasArg("line1") && server.hasArg("line2")) {
      line1 = server.arg("line1");
      line2 = server.arg("line2");
      scrollPos = 0; // Reset scroll on new message
      lastScroll = millis(); // Force update
      server.send(200, "text/plain", "OK");
    } else {
      server.send(400, "text/plain", "Missing args");
    }
  });

  server.begin();
}

void loop() {
  server.handleClient();
  
  if (millis() - lastScroll > 500) {
    lastScroll = millis();
    scrollDisplay(line1, line2);
    scrollPos++;
  }
}

