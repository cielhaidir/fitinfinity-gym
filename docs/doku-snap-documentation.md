
# DOKU API Documentation

## 1. Get Access Token

Untuk mendapatkan access token, kirim permintaan ke endpoint berikut:

- **Service Code**: 73  
- **HTTP Method**: `POST`  
- **Path**: `/authorization/v1/access-token/b2b`

### Headers

| Header           | Tipe   | Wajib | Deskripsi |
|------------------|--------|-------|-----------|
| `X-SIGNATURE`     | string | ✔️    | Signature untuk Non-Repudiation & Integrity checking. Dibuat dengan algoritma SHA256withRSA dari `client_ID + "|" + X-TIMESTAMP`. |
| `X-TIMESTAMP`     | string | ✔️    | Waktu permintaan dalam format ISO8601 UTC. Misal jam 08:51:00 WIB = `2020-09-22T01:51:00Z`. |
| `X-CLIENT-KEY`    | string | ✔️    | `client_id` yang diberikan oleh DOKU saat registrasi. |
| `Content-Type`    | string | ✔️    | Jenis konten, biasanya `application/json`. |

### Request Body

```json
{
  "grantType": "client_credentials"
}
```

> `client_credentials`: Client meminta access token hanya dengan kredensialnya sendiri, untuk mengakses resource miliknya.  
> *(Referensi: OAuth 2.0 RFC 6749 & 6750)*

---

## 2. ShopeePay Payment API (Host-to-Host)

ShopeePay tidak memerlukan akun terhubung. Setelah customer memilih ShopeePay saat checkout, merchant perlu memanggil API ini untuk mendapatkan URL redirect ShopeePay.

### Endpoint

- **HTTP Method**: `POST`
- **Sandbox URL**: `https://api-sandbox.doku.com`
- **Production URL**: `https://api.doku.com`
- **Path**: `/direct-debit/core/v1/debit/payment-host-to-host`

### Contoh Request

```http
POST /direct-debit/core/v1/debit/payment-host-to-host HTTP/1.1
Host: {api-domain}
X-TIMESTAMP: 2020-12-21T07:56:11.000Z
X-SIGNATURE: 85be817c55b2c135157c7e89f52499bf0c25ad6eeebe04a986e8c862561b19a5
X-PARTNER-ID: 821508239190
X-EXTERNAL-ID: 418075533589
Authorization: 95221
Content-Type: application/json
Accept: */*
Content-Length: 286
```

#### Request Body

```json
{
  "partnerReferenceNo": "INV-0001",
  "validUpTo": "2024-07-10T11:57:58+07:00",
  "pointOfInitiation": "app",
  "urlParam": {
    "url": "https://www.merchant.com/",
    "type": "PAY_RETURN",
    "isDeepLink": "Y/N"
  },
  "amount": {
    "value": "10000.00",
    "currency": "IDR"
  },
  "additionalInfo": {
    "channel": "EMONEY_SHOPEE_PAY_SNAP"
  }
}
```

### Contoh Response

```json
{
  "responseCode": "2000500",
  "responseMessage": "Successful",
  "webRedirectUrl": "https://app-uat.doku.com/link/283702597342040",
  "partnerReferenceNo": "INV-0001"
}
```

---
