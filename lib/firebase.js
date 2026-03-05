const admin = require('firebase-admin');

let db;

function initializeFirebase() {
  if (admin.apps.length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('⚠️  Variables de Firebase no configuradas. Usando modo desarrollo.');
        return null;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });

      db = admin.firestore();
      console.log('✅ Firebase inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error.message);
      return null;
    }
  } else {
    db = admin.firestore();
  }

  return db;
}

function getFirestore() {
  if (!db) {
    db = initializeFirebase();
  }
  return db;
}

module.exports = {
  initializeFirebase,
  getFirestore,
  admin
};
