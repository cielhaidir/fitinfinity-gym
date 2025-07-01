
# DOKU API Signature Guide

## 🔐 Signature Differences

There are **two types of `stringToSign`** depending on the API:

### 1. Access Token
```
stringToSign = client_ID + "|" + X-TIMESTAMP
```

### 2. Transactional (e.g. VA creation, payment)
```
stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + Timestamp
```

Before generating a signature, ensure all components are prepared correctly.

---

## 🧱 Signature Components

| Name         | Description |
|--------------|-------------|
| `privateKey` | RSA private key used for signing. |
| `HTTPMethod` | The HTTP method (e.g., POST, GET) used for the request. |
| `endpointURL`| The path of the API endpoint, e.g. `/bi-snap-va/v1/transfer-va/create-va` |
| `Timestamp`  | Same as `X-TIMESTAMP` header in ISO8601 UTC format |
| `RequestBody`| The minified JSON body of the request |

---

## 🔧 How to Generate Key Pair (OpenSSL)

```bash
# Generate Private Key
openssl genrsa -out private.key 2048

# Set passphrase on Private Key (optional)
openssl pkcs8 -topk8 -inform PEM -outform PEM -in private.key -out pkcs8.key -v1 PBE-SHA1-3DES

# Extract Public Key
openssl rsa -in private.key -outform PEM -pubout -out public.pem
```

---

## 🔽 Minify Request Body Example

### Before:
```json
{
   "partnerServiceId":"  088899",
   "customerNo":"12345678901234567890",
   "virtualAccountNo":"  08889912345678901234567890",
   "virtualAccountName":"Jokul Doe",
   "virtualAccountEmail":"jokul@email.com",
   "virtualAccountPhone":"6281828384858",
   "trxId":"abcdefgh1234",
   "totalAmount":{
      "value":"12345678.00",
      "currency":"IDR"
   }
}
```

### After (Minified):
```json
{"partnerServiceId":"  088899","customerNo":"12345678901234567890","virtualAccountNo":"  08889912345678901234567890","virtualAccountName":"Jokul Doe","virtualAccountEmail":"jokul@email.com","virtualAccountPhone":"6281828384858","trxId":"abcdefgh1234","totalAmount":{"value":"12345678.00","currency":"IDR"}}
```

---

## 🔁 Generate SHA256 Digest

Hash the minified body with SHA-256 and hex encode the result (lowercase):

Example:
```
SHA256(minified_body) = 3274fab8dac896837b106a16da2a974e7e65142dcecb4b768ef0294102838977
```

---

## 🧮 Generate Final stringToSign

Use the formula:

```
HTTPMethod + ":" + EndpointUrl + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp
```

Example:
```
POST:/bi-snap-va/v1/transfer-va/create-va:3274fab8dac896837b106a16da2a974e7e65142dcecb4b768ef0294102838977:2024-07-01T01:00:00Z
```

---

## ✍️ Generate Signature

Sign the `stringToSign` using your private key with algorithm `SHA256withRSA`.

**Example output**:
```
qd2m9ot+cfq48qJ68+8IYdfkNDMA2hhecM2XegsnZ1Z5Fur9zii8BVm6cI7g1gyhL5/+OFZqAO8Kp0XPMdipfg==
```

Place this value into the `X-SIGNATURE` header in your API requests.

---
