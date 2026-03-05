const { getFirestore } = require('./firebase');

class FirestoreService {
  constructor() {
    this.collectionName = 'qr_payments';
  }

  getDb() {
    return getFirestore();
  }

  // Crear nueva transacción de pago
  async create(transactionData) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const docRef = db.collection(this.collectionName).doc(transactionData.transactionId);
      await docRef.set({
        ...transactionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return transactionData;
    } catch (error) {
      console.error('Error creando transacción:', error);
      throw error;
    }
  }

  // Obtener transacción por ID
  async getById(transactionId) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const doc = await db.collection(this.collectionName).doc(transactionId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error obteniendo transacción:', error);
      throw error;
    }
  }

  // Actualizar estado de transacción
  async updateStatus(transactionId, status, paymentData = {}) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const updateData = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
        updateData.paymentData = paymentData;
      }

      await db.collection(this.collectionName).doc(transactionId).update(updateData);

      return await this.getById(transactionId);
    } catch (error) {
      console.error('Error actualizando transacción:', error);
      throw error;
    }
  }

  // Obtener todas las transacciones
  async getAll(limit = 100) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const snapshot = await db.collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const transactions = [];
      snapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return transactions;
    } catch (error) {
      console.error('Error obteniendo transacciones:', error);
      throw error;
    }
  }

  // Obtener transacciones por estado
  async getByStatus(status, limit = 100) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const snapshot = await db.collection(this.collectionName)
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const transactions = [];
      snapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return transactions;
    } catch (error) {
      console.error('Error obteniendo transacciones por estado:', error);
      throw error;
    }
  }

  // Obtener estadísticas
  async getStats() {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const all = await this.getAll(1000);
      
      const completed = all.filter(t => t.status === 'completed');
      const pending = all.filter(t => t.status === 'pending');
      const expired = all.filter(t => t.status === 'expired');
      
      const totalAmount = completed.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        total: all.length,
        completed: completed.length,
        pending: pending.length,
        expired: expired.length,
        totalAmount: totalAmount,
        transactions: all.slice(0, 50)
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Marcar QRs expirados
  async markExpiredTransactions() {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const now = new Date();
      const snapshot = await db.collection(this.collectionName)
        .where('status', '==', 'pending')
        .get();

      const batch = db.batch();
      let expiredCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (new Date(data.expiresAt) < now) {
          batch.update(doc.ref, {
            status: 'expired',
            updatedAt: now.toISOString()
          });
          expiredCount++;
        }
      });

      if (expiredCount > 0) {
        await batch.commit();
        console.log(`🧹 ${expiredCount} transacciones marcadas como expiradas`);
      }

      return expiredCount;
    } catch (error) {
      console.error('Error marcando transacciones expiradas:', error);
      throw error;
    }
  }

  // Obtener transacciones recientes
  async getRecent(limit = 10) {
    try {
      const db = this.getDb();
      if (!db) throw new Error('Firebase no inicializado');

      const snapshot = await db.collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const transactions = [];
      snapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return transactions;
    } catch (error) {
      console.error('Error obteniendo transacciones recientes:', error);
      throw error;
    }
  }
}

const firestoreService = new FirestoreService();

module.exports = firestoreService;
