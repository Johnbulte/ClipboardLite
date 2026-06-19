const crypto = require('crypto');
const os = require('os');

const PRODUCT_ID = 'cliply-pro';
const DEFAULT_LOCAL_PAYMENT_API_URL = 'http://localhost:8787';

class PaymentClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PaymentClientError';
    this.status = details.status || 0;
    this.code = details.code || '';
  }
}

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function createDefaultDeviceId() {
  const raw = `${os.hostname()}|${os.userInfo().username}|${process.platform}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function normalizeLicenseKey(value) {
  return String(value || '').trim();
}

function createPaymentClient(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const configuredBaseUrl = env.CLIPLY_PAYMENT_API_URL || (!env.NODE_ENV || env.NODE_ENV === 'development' ? DEFAULT_LOCAL_PAYMENT_API_URL : '');
  const baseUrl = trimTrailingSlash(configuredBaseUrl);
  const deviceId = String(env.CLIPLY_DEVICE_ID || '').trim() || createDefaultDeviceId();

  function ensureConfigured() {
    if (!baseUrl) {
      throw new PaymentClientError('Payment service is not configured. Set CLIPLY_PAYMENT_API_URL.');
    }
    if (typeof fetchImpl !== 'function') {
      throw new PaymentClientError('Fetch is not available in this runtime.');
    }
  }

  async function post(path, body) {
    ensureConfigured();
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new PaymentClientError(payload.error || payload.message || `Payment service request failed with ${response.status}.`, {
        status: response.status,
        code: payload.code || ''
      });
    }

    return payload;
  }

  return {
    isConfigured() {
      return !!baseUrl;
    },
    getDeviceId() {
      return deviceId;
    },
    createCheckout({ email } = {}) {
      return post('/v1/checkout', {
        product: PRODUCT_ID,
        email: String(email || '').trim(),
        deviceId
      });
    },
    activateLicense({ licenseKey } = {}) {
      return post('/v1/licenses/activate', {
        licenseKey: normalizeLicenseKey(licenseKey),
        deviceId
      });
    },
    refreshSubscription({ licenseKey } = {}) {
      return post('/v1/licenses/refresh', {
        licenseKey: normalizeLicenseKey(licenseKey),
        deviceId
      });
    }
  };
}

module.exports = {
  PRODUCT_ID,
  DEFAULT_LOCAL_PAYMENT_API_URL,
  PaymentClientError,
  createPaymentClient
};
