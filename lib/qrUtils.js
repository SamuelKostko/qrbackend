const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generar ID único de transacción
function generateTransactionId() {
  return uuidv4();
}

// Generar código QR como Data URL
async function generateQRCode(data) {
  try {
    const qrDataURL = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataURL;
  } catch (error) {
    throw new Error('Error generando código QR: ' + error.message);
  }
}

// Calcular fecha de expiración
function calculateExpirationDate(minutes) {
  const expirationMinutes = minutes || parseInt(process.env.QR_EXPIRATION_MINUTES) || 30;
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
  return expirationDate.toISOString();
}

// Verificar si un QR ha expirado
function isExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

// Formatear monto a moneda
function formatAmount(amount) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP'
  }).format(amount);
}

module.exports = {
  generateTransactionId,
  generateQRCode,
  calculateExpirationDate,
  isExpired,
  formatAmount
};
