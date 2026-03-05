require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeFirebase } = require('../lib/firebase');
const db = require('../lib/database');
const { 
  generateTransactionId, 
  generateQRCode, 
  calculateExpirationDate,
  isExpired 
} = require('../lib/qrUtils');

const app = express();

// Inicializar Firebase
initializeFirebase();

// Middleware
app.use(cors({
  origin: '*', // Permite peticiones desde tu app SAMUEL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== RUTAS PARA GENERAR QR ====================

/**
 * POST /api/payments/generate
 * Genera un QR de cobro con monto específico
 * 
 * Body: {
 *   amount: number (requerido),
 *   expirationMinutes: number (opcional, default: 30),
 *   merchantId: string (opcional),
 *   description: string (opcional)
 * }
 */
app.post('/api/payments/generate', async (req, res) => {
  try {
    const { amount, expirationMinutes, merchantId, description } = req.body;

    // Validaciones
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    // Crear datos de la transacción
    const transactionId = generateTransactionId();
    const expiresAt = calculateExpirationDate(expirationMinutes);
    
    // Datos que irán en el QR (formato compatible con tu app)
    const qrPayload = {
      type: 'payment',
      transactionId,
      amount: parseFloat(amount),
      merchantId: merchantId || 'SAMUEL_DEFAULT',
      timestamp: new Date().toISOString()
    };

    // Generar código QR
    const qrCodeImage = await generateQRCode(qrPayload);

    // Guardar en Firestore
    const transaction = {
      transactionId,
      amount: parseFloat(amount),
      status: 'pending',
      qrCodeImage,
      qrPayload,
      expiresAt,
      merchantId: merchantId || null,
      description: description || null,
      metadata: {}
    };

    await db.create(transaction);

    res.status(201).json({
      success: true,
      message: 'Código QR generado exitosamente',
      data: {
        transactionId,
        amount: transaction.amount,
        qrCodeImage,
        qrPayload,
        expiresAt,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creando QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando código QR',
      error: error.message
    });
  }
});

// ==================== RUTAS PARA VALIDAR Y PROCESAR PAGOS ====================

/**
 * POST /api/payments/validate
 * Valida un QR escaneado desde la app SAMUEL y procesa el pago
 * 
 * Body: {
 *   transactionId: string (requerido),
 *   userId: string (opcional - ID del usuario de SAMUEL),
 *   cardId: string (opcional - ID de la tarjeta)
 * }
 */
app.post('/api/payments/validate', async (req, res) => {
  try {
    const { transactionId, userId, cardId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID requerido'
      });
    }

    // Buscar transacción
    const transaction = await db.getById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Verificar si ya fue procesada
    if (transaction.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Este QR ya fue utilizado',
        data: {
          completedAt: transaction.completedAt,
          transactionId: transaction.transactionId
        }
      });
    }

    // Verificar expiración
    if (isExpired(transaction.expiresAt)) {
      await db.updateStatus(transactionId, 'expired');
      return res.status(400).json({
        success: false,
        message: 'Este QR ha expirado',
        data: {
          expiresAt: transaction.expiresAt,
          transactionId: transaction.transactionId
        }
      });
    }

    // Procesar pago
    const paymentData = {
      userId: userId || null,
      cardId: cardId || null,
      processedAt: new Date().toISOString(),
      paymentMethod: 'qr_scan'
    };

    const updated = await db.updateStatus(transactionId, 'completed', paymentData);

    res.json({
      success: true,
      message: 'Pago procesado exitosamente',
      data: {
        transactionId,
        amount: transaction.amount,
        completedAt: updated.completedAt,
        // Calcular puntos (1 punto por peso)
        pointsEarned: Math.floor(transaction.amount)
      }
    });

  } catch (error) {
    console.error('Error validando QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando el pago',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/status/:transactionId
 * Consulta el estado de una transacción
 */
app.get('/api/payments/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await db.getById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Verificar si expiró
    if (transaction.status === 'pending' && isExpired(transaction.expiresAt)) {
      await db.updateStatus(transactionId, 'expired');
      transaction.status = 'expired';
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        expiresAt: transaction.expiresAt,
        completedAt: transaction.completedAt,
        merchantId: transaction.merchantId,
        description: transaction.description
      }
    });

  } catch (error) {
    console.error('Error consultando transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando transacción',
      error: error.message
    });
  }
});

// ==================== RUTAS PARA DASHBOARD ====================

/**
 * GET /api/dashboard/stats
 * Obtiene estadísticas generales
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/transactions
 * Lista todas las transacciones con filtros opcionales
 */
app.get('/api/dashboard/transactions', async (req, res) => {
  try {
    const { status, limit } = req.query;
    
    let transactions = status 
      ? await db.getByStatus(status, parseInt(limit) || 100)
      : await db.getAll(parseInt(limit) || 100);
    
    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo transacciones',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/recent
 * Obtiene las transacciones más recientes
 */
app.get('/api/dashboard/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await db.getRecent(limit);
    
    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error obteniendo transacciones recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo transacciones recientes',
      error: error.message
    });
  }
});

/**
 * POST /api/maintenance/expire
 * Marca manualmente los QRs expirados (endpoint de mantenimiento)
 */
app.post('/api/maintenance/expire', async (req, res) => {
  try {
    const count = await db.markExpiredTransactions();
    res.json({
      success: true,
      message: `${count} transacciones marcadas como expiradas`
    });
  } catch (error) {
    console.error('Error en mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error en proceso de mantenimiento',
      error: error.message
    });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'QR Payment Backend - SAMUEL Rewards Integration',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'QR Payment Backend API',
    version: '1.0.0',
    description: 'Backend para generar y procesar pagos con QR - Integrado con SAMUEL Rewards',
    endpoints: {
      payments: {
        generate: 'POST /api/payments/generate',
        validate: 'POST /api/payments/validate',
        status: 'GET /api/payments/status/:transactionId'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats',
        transactions: 'GET /api/dashboard/transactions',
        recent: 'GET /api/dashboard/recent'
      },
      maintenance: {
        expire: 'POST /api/maintenance/expire'
      },
      health: 'GET /api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard disponible en http://localhost:${PORT}/index.html`);
    console.log(`🔗 Integrado con SAMUEL Rewards`);
  });
}

// Exportar para Vercel
module.exports = app;
