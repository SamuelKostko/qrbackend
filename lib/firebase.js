const admin = require('firebase-admin');

let db;

function initializeFirebase() {
  if (admin.apps.length === 0) {
    try {
      const rawServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (rawServiceAccountJson) {
        let normalized = rawServiceAccountJson.trim();
        if (
          (normalized.startsWith('"') && normalized.endsWith('"')) ||
          (normalized.startsWith("'") && normalized.endsWith("'"))
        ) {
          normalized = normalized.slice(1, -1);
        }

        const serviceAccount = JSON.parse(normalized);
        if (serviceAccount && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
          console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON incompleto. Usando modo desarrollo.');
          return null;
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // Fallback legacy (por compatibilidad): FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
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
      }

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
