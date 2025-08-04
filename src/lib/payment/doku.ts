// src/lib/payment/doku.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DokuConfig {
  clientId: string;
  secretKey: string;
  apiUrl: string;
  isSandbox: boolean;
  privateKeyPath?: string; // Path to private key file for SNAP signature
}

interface DokuPaymentRequest {
  order: {
    amount: number;
    invoice_number: string;
    currency: string;
    callback_url: string;
    line_items?: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
    auto_redirect?: boolean; // Automatically redirect after payment
  };
  payment: {
    payment_method_types: string[];
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface DokuPaymentResponse {

    order: {
      amount: string;
      invoice_number: string;
      currency: string;
      session_id: string;
      callback_url: string;
      line_items: any[]; // Bisa di-detailin kalau mau
      auto_redirect: boolean;
    };

    payment: {
      payment_method_types: any[]; // Bisa di-detailin kalau mau
      payment_due_date: number;
      token_id: string;
      url: string;
      expired_date: string;
      expired_datetime: string;
    };

    customer: {
      id: string;
      phone: string;
      name: string;
    };

    additional_info: {
      origin: any;
      line_items: any[];
    };

    uuid: number;
    headers: {
      request_id: string;
      signature: string;
      date: string;
      client_id: string;
    };

}


// SNAP API interfaces
interface DokuSnapRequest {
  partnerReferenceNo: string;
  validUpTo: string;
  pointOfInitiation: string;
  urlParam: {
    url: string;
    type: string;
    isDeepLink: string;
  };
  amount: {
    value: string;
    currency: string;
  };
  additionalInfo: {
    channel: string;
  };
}

interface DokuSnapResponse {
  responseCode: string;
  responseMessage: string;
  webRedirectUrl: string;
  partnerReferenceNo: string;
}

// Peer to Peer interfaces
interface DokuP2PRequest {
  partnerReferenceNo: string;
  amount: {
    value: string;
    currency: string;
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  urlParam: {
    url: string;
    type: string;
  };
  additionalInfo: {
    channel: string;
  };
}

interface DokuP2PResponse {
  responseCode: string;
  responseMessage: string;
  webRedirectUrl: string;
  partnerReferenceNo: string;
}

// QRIS QR Generate & Query Interfaces
interface DokuQrisGenerateRequest {
  partnerReferenceNo: string;
  amount: { value: string; currency: string };
  feeAmount: { value: string; currency: string };
  merchantId: string;
  terminalId: string;
  validityPeriod?: string;
  additionalInfo: { postalCode: number; feeType: number };
}

interface DokuQrisGenerateResponse {
  qrString: string;
  partnerReferenceNo: string;
  responseCode: string;
  responseMessage: string;
  [key: string]: any;
}

interface DokuQrisQueryRequest {
  originalReferenceNo: string;
  originalPartnerReferenceNo: string;
  serviceCode: number;
  merchantId: string;
}

interface DokuQrisQueryResponse {
  responseCode: string;
  responseMessage: string;
  transactionStatus: string;
  [key: string]: any;
}

export class DokuPaymentService {
  private config: DokuConfig;

  constructor(config: DokuConfig) {
    this.config = config;
  }

  // Read private key from file
  private getPrivateKey(): string {
    if (!this.config.privateKeyPath) {
      throw new Error('Private key path is required for SNAP signature');
    }

    try {
      // Resolve the private key path
      const keyPath = path.isAbsolute(this.config.privateKeyPath) 
        ? this.config.privateKeyPath 
        : path.join(process.cwd(), this.config.privateKeyPath);

      // Check if file exists
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found at: ${keyPath}`);
      }

      // Read the private key file
      const privateKey = fs.readFileSync(keyPath, 'utf-8');
      
      if (!privateKey.trim()) {
        throw new Error('Private key file is empty');
      }

      return privateKey;
    } catch (error) {
      console.error('Error reading private key file:', error);
      throw new Error(`Failed to read private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate signature for regular checkout API
  private generateLegacySignature(
    requestTarget: string,
    clientId: string,
    requestId: string,
    timestamp: string,
    requestBody?: string,
  ): string {
    let digest = '';
    let signatureLines = [
      `Client-Id:${clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${requestTarget}`,
    ];
  
    if (requestBody) {
      digest = crypto
        .createHash('sha256')
        .update(requestBody)
        .digest('base64');
      signatureLines.push(`Digest:${digest}`);
    }
  
    const rawSignature = signatureLines.join('\n');
    console.log('Raw Signature:', rawSignature);
  
    const hmac = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(rawSignature)
      .digest('base64');
  
    return hmac; // no need to add 'HMACSHA256=' here, just return pure signature
  }
  // Generate signature for different DOKU APIs
  private generateSignature(
    method: 'ACCESS_TOKEN' | 'TRANSACTIONAL',
    clientId: string,
    timestamp: string,
    httpMethod?: string,
    endpointUrl?: string,
    requestBody?: string,
    accessToken?: string,
  ): string {
    try {
      let stringToSign: string;
      
      if (method === 'ACCESS_TOKEN') {
        // For access token: client_ID + "|" + X-TIMESTAMP (uses RSA signature)
        const privateKeyContent = this.getPrivateKey();
        stringToSign = `${clientId}|${timestamp}`;
        
        // Format the private key
        let privateKey = privateKeyContent.trim();
        
        // Replace any \n in the environment variable with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // If the key doesn't have proper headers, add them
        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          // Clean the key content
          const keyContent = privateKey.replace(/\s+/g, '');
          // Add proper PKCS#8 headers and format with line breaks every 64 characters
          privateKey = `-----BEGIN PRIVATE KEY-----\n${keyContent.match(/.{1,64}/g)?.join('\n') || keyContent}\n-----END PRIVATE KEY-----`;
        }
        
        // Validate the key format
        if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
          throw new Error('Invalid private key format. Key must be in PKCS#8 format.');
        }

        console.log('Generating ACCESS_TOKEN signature with RSA');
        console.log('String to sign:', stringToSign);
        
        const sign = crypto.createSign('SHA256');
        sign.update(stringToSign);
        sign.end();
        
        return sign.sign(privateKey, 'base64');
        
      } else if (method === 'TRANSACTIONAL') {
        // For transactional: HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + Timestamp (uses HMAC)
        if (!httpMethod || !endpointUrl || !requestBody || !accessToken) {
          throw new Error('HTTP method, endpoint URL, request body, and access token are required for transactional signature');
        }
        
        // Minify the request body (remove unnecessary whitespace)
        const minifiedBody = JSON.stringify(JSON.parse(requestBody));
        
        // Generate SHA256 hash of minified body
        const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
        
        stringToSign = `${httpMethod}:${endpointUrl}:${accessToken}:${bodyHash}:${timestamp}`;
        
        console.log('Generating TRANSACTIONAL signature with HMAC');
        console.log('String to sign:', stringToSign);
        
        // Use HMAC-SHA512 with client secret
        const hmac = crypto.createHmac('sha512', this.config.secretKey);
        hmac.update(stringToSign);
        
        return hmac.digest('base64');
      } else {
        throw new Error('Invalid signature method');
      }
    } catch (error) {
      console.error(`Error generating ${method} signature:`, error);
      
      // Check if it's a key format issue
      if (error instanceof Error && error.message.includes('unsupported')) {
        throw new Error('Invalid private key format. Please ensure you have a valid PKCS#8 private key from DOKU. Contact DOKU support if you need a new key.');
      }
      
      throw new Error(`Failed to generate ${method} signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get access token for SNAP API
  private async getAccessToken(): Promise<string> {
    if (!this.config.privateKeyPath) {
      throw new Error('Private key path is required for SNAP API access token. Please set DOKU_PRIVATE_KEY_PATH in your environment variables.');
    }

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    const signature = this.generateSignature('ACCESS_TOKEN', this.config.clientId, timestamp);
    
    const requestBody = {
      grantType: 'client_credentials'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-SIGNATURE': signature,
      'X-TIMESTAMP': timestamp,
      'X-CLIENT-KEY': this.config.clientId,
    };

    try {
      const response = await fetch(`${this.config.apiUrl}/authorization/v1/access-token/b2b`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('Access Token Request:', {
        url: `${this.config.apiUrl}/authorization/v1/access-token/b2b`,
        method: 'POST',
        headers,
        body: requestBody,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Access token error response:', errorText);
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.accessToken) {
        console.error('No access token in response:', result);
        throw new Error('No access token received from DOKU API');
      }

      return result.accessToken;
    } catch (error) {
      console.error('Failed to get SNAP access token:', error);
      throw error;
    }
  }
  
  private async makeRequest(endpoint: string, method: string, body?: any) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const requestUrl = `${this.config.apiUrl}${endpoint}`;


    const requestBody = body ? JSON.stringify(body) : '';
    const endpoint_new = '/checkout/v1/payment';
    const requestId = crypto.randomUUID();
    
    const signature = this.generateLegacySignature(
      endpoint_new,
      this.config.clientId,
      requestId,
      timestamp,
      requestBody,
    );

    const headers = {
      'Content-Type': 'application/json',
      'client-id': this.config.clientId,
      'request-id': requestId,
      'request-timestamp': timestamp,
      'signature': `HMACSHA256=${signature}`,
    };

    
    try {
      const response = await fetch(requestUrl, {
        method,
        headers,
        body: requestBody || undefined,
      });
      const body = await response.json();
    

      console.log('Doku API Request:', {
        url: requestUrl,
        method,
        headers,
        body: requestBody,
      });

      console.log('Doku API Response:', {
        message: body
      }
      )

      if (!response.ok) {
        throw new Error(`Doku API error: ${response.status} ${response.statusText}`);
      }

      return await body.response;
    } catch (error) {
      console.error('Doku API request failed:', error);
      throw error;
    }
  }

  async createPayment(params: {
    amount: number;
    orderId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    callbackUrl: string;
    items?: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  }): Promise<DokuPaymentResponse> {

    const paymentRequest: DokuPaymentRequest = {
      order: {
        amount: params.amount + (params.amount * 0.05) + 2000,
        invoice_number: params.orderId,
        currency: 'IDR',
        callback_url: params.callbackUrl,
        line_items: params.items,
        auto_redirect: true, // Automatically redirect after payment
      },
      payment: {
      payment_method_types: [
        "VIRTUAL_ACCOUNT_BCA",
        "VIRTUAL_ACCOUNT_BANK_MANDIRI",
        "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",
        "VIRTUAL_ACCOUNT_DOKU",
        "VIRTUAL_ACCOUNT_BRI",
        "VIRTUAL_ACCOUNT_BNI",
        "VIRTUAL_ACCOUNT_BANK_PERMATA",
        "VIRTUAL_ACCOUNT_BANK_CIMB",
        "VIRTUAL_ACCOUNT_BANK_DANAMON",
        "VIRTUAL_ACCOUNT_BNC",
        "VIRTUAL_ACCOUNT_BTN",
        "ONLINE_TO_OFFLINE_ALFA",
        "ONLINE_TO_OFFLINE_INDOMARET",
        "CREDIT_CARD",
        // "DIRECT_DEBIT_BRI",
        "EMONEY_SHOPEE_PAY",
        // "EMONEY_OVO",
        // "EMONEY_DANA",
        "QRIS",
        "PEER_TO_PEER_AKULAKU",
        // "PEER_TO_PEER_KREDIVO",
        // "PEER_TO_PEER_INDODANA"
      ]
      },
      customer: {
        id: params.customerId, // Use orderId as customer ID
        name: params.customerName,
        phone: params.customerPhone,
      },
    };

    return this.makeRequest('/checkout/v1/payment', 'POST', paymentRequest);
  }

  // Create Shopee SNAP payment
  async createShopeePayment(params: {
    amount: number;
    orderId: string;
    callbackUrl: string;
  }): Promise<DokuSnapResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const externalId = crypto.randomUUID();
    
    // Validate amount to be at least 10000 IDR for ShopeePay
    const validUpTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    
    const requestBody: DokuSnapRequest = {
      partnerReferenceNo: params.orderId,
      validUpTo: validUpTo,
      pointOfInitiation: 'app',
      urlParam: {
        url: params.callbackUrl,
        type: 'PAY_RETURN',
        isDeepLink: 'N'
      },
      amount: {
        value: params.amount.toFixed(2),
        currency: 'IDR'
      },
      additionalInfo: {
        channel: 'EMONEY_SHOPEE_PAY_SNAP'
      }
    };

    const endpointUrl = '/direct-debit/core/v1/debit/payment-host-to-host';
    const signature = this.generateSignature(
      'TRANSACTIONAL',
      this.config.clientId,
      timestamp,
      'POST',
      endpointUrl,
      JSON.stringify(requestBody),
      accessToken
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'Authorization': `Bearer ${accessToken}`,
    };

    try {
      const response = await fetch(`${this.config.apiUrl}${endpointUrl}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('Shopee SNAP API Request:', {
        url: `${this.config.apiUrl}${endpointUrl}`,
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopee SNAP API Error:', errorText);
        throw new Error(`Shopee SNAP API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Shopee SNAP payment creation failed:', error);
      throw error;
    }
  }

  // Create Kredivo payment (P2P)
  async createKredivoPayment(params: {
    amount: number;
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    callbackUrl: string;
  }): Promise<DokuP2PResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString();
    const externalId = crypto.randomUUID();
    
    const requestBody: DokuP2PRequest = {
      partnerReferenceNo: params.orderId,
      amount: {
        value: params.amount.toFixed(2),
        currency: 'IDR'
      },
      customer: {
        name: params.customerName,
        phone: params.customerPhone,
        email: params.customerEmail,
      },
      urlParam: {
        url: params.callbackUrl,
        type: 'PAY_RETURN'
      },
      additionalInfo: {
        channel: 'KREDIVO'
      }
    };

    const endpointUrl = '/peer-to-peer/core/v1/payment/checkout';
    const signature = this.generateSignature(
      'TRANSACTIONAL',
      this.config.clientId,
      timestamp,
      'POST',
      endpointUrl,
      JSON.stringify(requestBody),
      accessToken
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'Authorization': `Bearer ${accessToken}`,
    };

    try {
      const response = await fetch(`${this.config.apiUrl}/peer-to-peer/core/v1/payment/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kredivo P2P API Error:', errorText);
        throw new Error(`Kredivo P2P API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kredivo payment creation failed:', error);
      throw error;
    }
  }

  // Create Akulaku payment (P2P)
  async createAkulakuPayment(params: {
    amount: number;
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerId: string;
    callbackUrl: string;
  }): Promise<DokuP2PResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString();
    const externalId = crypto.randomUUID();
    
    const requestBody: DokuP2PRequest = {
      partnerReferenceNo: params.orderId,
      amount: {
        value: params.amount.toFixed(2),
        currency: 'IDR'
      },
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      urlParam: {
        url: params.callbackUrl,
        type: 'PAY_RETURN'
      },
      additionalInfo: {
        channel: 'AKULAKU'
      }
    };

    const endpointUrl = '/peer-to-peer/core/v1/payment/checkout';
    const signature = this.generateSignature(
      'TRANSACTIONAL',
      this.config.clientId,
      timestamp,
      'POST',
      endpointUrl,
      JSON.stringify(requestBody),
      accessToken
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'Authorization': `Bearer ${accessToken}`,
    };

    try {
      const response = await fetch(`${this.config.apiUrl}/peer-to-peer/core/v1/payment/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Akulaku P2P API Error:', errorText);
        throw new Error(`Akulaku P2P API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Akulaku payment creation failed:', error);
      throw error;
    }
  }

  // QRIS QR Generate
  async createQrisPayment(params: DokuQrisGenerateRequest): Promise<DokuQrisGenerateResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const externalId = crypto.randomUUID();
    const endpointUrl = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';

    const signature = this.generateSignature(
      'TRANSACTIONAL',
      this.config.clientId,
      timestamp,
      'POST',
      endpointUrl,
      JSON.stringify(params),
      accessToken
    );

    const headers = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await fetch(`${this.config.apiUrl}${endpointUrl}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QRIS Generate API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  // QRIS QR Query
  async queryQrisPayment(params: DokuQrisQueryRequest): Promise<DokuQrisQueryResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const externalId = crypto.randomUUID();
    const endpointUrl = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

    const signature = this.generateSignature(
      'TRANSACTIONAL',
      this.config.clientId,
      timestamp,
      'POST',
      endpointUrl,
      JSON.stringify(params),
      accessToken
    );

    const headers = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await fetch(`${this.config.apiUrl}${endpointUrl}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QRIS Query API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async checkPaymentStatus(orderId: string) {
    return this.makeRequest(`/payment/${orderId}/status`, 'GET');
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string,
    url: string,
  ): boolean {
    try {
      const calculatedSignature = this.generateLegacySignature(
        this.config.clientId,
        'webhook',
        timestamp,
        rawBody,
        url,
      );
      return `HMACSHA256=${calculatedSignature}` === signature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }


  verifyWebhookSignatureFromHeaders(
    rawBody: string,
    requestTarget: string,
    headers: Headers
  ): boolean {
    try {
      const clientId = headers.get('client-id');
      const requestId = headers.get('request-id');
      const timestamp = headers.get('request-timestamp');
      const signature = headers.get('signature');
  
      if (!clientId || !requestId || !timestamp || !signature) {
        console.error('Missing signature headers');
        return false;
      }
  
      const calculatedSignature = this.generateLegacySignature(
        clientId,
        requestId,
        timestamp,
        requestTarget,
        rawBody,
      );
  
      return `HMACSHA256=${calculatedSignature}` === signature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  async inquirePayment(orderId: string) {
    const endpoint = `/orders/v1/status/${orderId}`;
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const requestId = crypto.randomUUID();
    const signature = this.generateLegacySignature(
      endpoint,
      this.config.clientId,
      requestId,
      timestamp,
    );
  
    const headers = {
      "Content-Type": "application/json",
      "client-id": this.config.clientId,
      "request-id": requestId,
      "request-timestamp": timestamp,
      "signature": `HMACSHA256=${signature}`,
    };
  
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: "GET",
      headers,
    });


    if (!response.ok) {
      throw new Error(`Inquiry failed with status ${response.status}`);
    }

  
    const result = await response.json();
    console.log('Doku Payment Inquiry Response:', result);
    return result;
  }
  
  
}

// Create a singleton instance with environment variables
export const dokuPaymentService = new DokuPaymentService({
  clientId: process.env.DOKU_CLIENT_ID || '',
  secretKey: process.env.DOKU_SECRET_KEY || '',
  apiUrl: process.env.DOKU_API_URL || 'https://api.doku.com',
  isSandbox: process.env.DOKU_SANDBOX_MODE === 'true',
  privateKeyPath: process.env.DOKU_PRIVATE_KEY_PATH || '',
});