# 🎫 Backend de Pagos QR - Integración con SAMUEL Rewards

Sistema backend para generar códigos QR de cobro que se escanean desde la app **SAMUEL Rewards** (`https://lealtad-three.vercel.app`).

## 🎯 Funcionamiento

1. **Comercio** genera un QR con un monto específico desde el Dashboard
2. **Cliente** escanea el QR desde la app SAMUEL Rewards
3. **Sistema** valida y procesa el pago
4. **Cliente** recibe puntos por su compra (1 punto por cada peso)

## 🚀 Deploy Rápido

### 1. Configurar Firebase (5 min)

```bash
# 1. Crea proyecto en https://console.firebase.google.com/
# 2. Habilita Firestore Database
# 3. Descarga credenciales: Settings > Service Accounts > Generate Key
```

### 2. Deploy en Vercel (3 min)

```bash
# Opción A: Con GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Luego en vercel.com:
# - Import from GitHub
# - Agrega variables de entorno (ver abajo)
# - Deploy

# Opción B: Con Vercel CLI
npm install -g vercel
vercel login
vercel
```

### 3. Variables de Entorno en Vercel

```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
QR_EXPIRATION_MINUTES=30
SAMUEL_APP_URL=https://lealtad-three.vercel.app
NODE_ENV=production
```

## 📡 API Endpoints

### Para Generar QR (Desde Dashboard o App del Comercio)

```javascript
POST https://tu-backend.vercel.app/api/payments/generate

Body:
{
  "amount": 150.50,
  "description": "Compra en tienda",
  "expirationMinutes": 30
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "uuid-aqui",
    "amount": 150.50,
    "qrCodeImage": "data:image/png;base64,...",
    "qrPayload": {
      "type": "payment",
      "transactionId": "uuid-aqui",
      "amount": 150.50,
      "merchantId": "SAMUEL_DEFAULT",
      "timestamp": "2024-03-05T..."
    },
    "expiresAt": "2024-03-05T15:30:00Z",
    "status": "pending"
  }
}
```

### Para Validar QR (Desde App SAMUEL)

**IMPORTANTE**: Este endpoint debe llamarse desde tu app SAMUEL cuando el cliente escanee el QR.

```javascript
POST https://tu-backend.vercel.app/api/payments/validate

Body:
{
  "transactionId": "uuid-del-qr-escaneado",
  "userId": "id-del-usuario-samuel",  // opcional
  "cardId": "id-de-tarjeta-samuel"    // opcional
}

Response (Éxito):
{
  "success": true,
  "message": "Pago procesado exitosamente",
  "data": {
    "transactionId": "uuid-aqui",
    "amount": 150.50,
    "completedAt": "2024-03-05T14:45:00Z",
    "pointsEarned": 150  // Para otorgar al cliente
  }
}

Response (Error - QR Expirado):
{
  "success": false,
  "message": "Este QR ha expirado",
  "data": {
    "expiresAt": "2024-03-05T14:00:00Z",
    "transactionId": "uuid-aqui"
  }
}

Response (Error - QR Ya Usado):
{
  "success": false,
  "message": "Este QR ya fue utilizado",
  "data": {
    "completedAt": "2024-03-05T14:30:00Z",
    "transactionId": "uuid-aqui"
  }
}
```

### Consultar Estado

```javascript
GET https://tu-backend.vercel.app/api/payments/status/:transactionId

Response:
{
  "success": true,
  "data": {
    "transactionId": "uuid-aqui",
    "amount": 150.50,
    "status": "completed",  // pending | completed | expired
    "createdAt": "2024-03-05T14:00:00Z",
    "expiresAt": "2024-03-05T15:30:00Z",
    "completedAt": "2024-03-05T14:45:00Z"
  }
}
```

## 🔗 Integración con App SAMUEL Rewards

### Paso 1: Modificar el Escáner de QR en SAMUEL

En tu app SAMUEL (`https://lealtad-three.vercel.app`), cuando se escanee un QR:

```javascript
// En tu componente de escáner
async function handleQRScanned(qrData) {
  try {
    // Parsear el QR escaneado
    const payload = JSON.parse(qrData);
    
    // Verificar que sea un QR de pago
    if (payload.type === 'payment') {
      // Mostrar confirmación al usuario
      const confirmPayment = confirm(`¿Confirmar pago de RD$ ${payload.amount}?`);
      
      if (confirmPayment) {
        // Llamar a tu backend para validar el pago
        const response = await fetch('https://tu-backend.vercel.app/api/payments/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: payload.transactionId,
            userId: currentUser.id,      // ID del usuario logueado
            cardId: currentUser.cardId    // ID de su tarjeta
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // ✅ Pago exitoso
          // Otorgar puntos al usuario
          await grantPoints(currentUser.id, result.data.pointsEarned);
          
          // Mostrar mensaje de éxito
          showSuccessMessage(`¡Pago exitoso! Ganaste ${result.data.pointsEarned} puntos`);
          
          // Actualizar balance de puntos en la UI
          updatePointsDisplay();
        } else {
          // ❌ Error en el pago
          showErrorMessage(result.message);
        }
      }
    } else {
      // Es otro tipo de QR (no es de pago)
      handleOtherQRType(payload);
    }
  } catch (error) {
    console.error('Error procesando QR:', error);
    showErrorMessage('QR inválido o error de conexión');
  }
}
```

### Paso 2: Función para Otorgar Puntos

```javascript
// En tu sistema SAMUEL
async function grantPoints(userId, points) {
  // Actualizar puntos en tu base de datos
  const userRef = db.collection('users').doc(userId);
  
  await userRef.update({
    points: firebase.firestore.FieldValue.increment(points),
    lastTransaction: new Date(),
    transactions: firebase.firestore.FieldValue.arrayUnion({
      type: 'payment_qr',
      points: points,
      timestamp: new Date()
    })
  });
}
```

## 🖥️ Dashboard para Comercios

Accede al dashboard en: `https://tu-backend.vercel.app/dashboard.html`

### Funcionalidades:
- ✅ Generar códigos QR con montos específicos
- ✅ Ver transacciones en tiempo real
- ✅ Filtrar por estado (pendientes, completadas, expiradas)
- ✅ Estadísticas de ventas
- ✅ Auto-actualización cada 30 segundos

## 📱 Flujo Completo de Pago

```
1. COMERCIO (Dashboard)
   └─> Genera QR con monto: RD$ 150
   
2. CLIENTE (App SAMUEL)
   └─> Escanea QR
   └─> Confirma pago
   
3. BACKEND (API)
   └─> Valida transacción
   └─> Marca como completada
   └─> Retorna puntos ganados
   
4. APP SAMUEL
   └─> Otorga 150 puntos al cliente
   └─> Actualiza balance
   └─> Muestra confirmación
```

## 🔐 Formato del QR

Cada QR contiene un JSON con esta estructura:

```json
{
  "type": "payment",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 150.50,
  "merchantId": "SAMUEL_DEFAULT",
  "timestamp": "2024-03-05T14:30:00.000Z"
}
```

## 🛡️ Seguridad

### Estados de Transacción
- `pending`: QR generado, esperando pago
- `completed`: Pago procesado exitosamente
- `expired`: QR expirado sin procesar

### Validaciones
- ✅ Cada QR es de un solo uso
- ✅ Tiempo de expiración configurable
- ✅ Validación de monto
- ✅ Prevención de doble gasto
- ✅ CORS habilitado para tu dominio

## 📊 Estructura de Firebase

```
Firestore Collection: qr_payments
├── {transactionId}
│   ├── transactionId: string
│   ├── amount: number
│   ├── status: "pending" | "completed" | "expired"
│   ├── qrCodeImage: string (base64)
│   ├── qrPayload: object
│   ├── createdAt: timestamp
│   ├── expiresAt: timestamp
│   ├── completedAt: timestamp (opcional)
│   ├── merchantId: string (opcional)
│   ├── description: string (opcional)
│   └── paymentData: object (opcional)
│       ├── userId: string
│       ├── cardId: string
│       └── processedAt: timestamp
```

## 🔧 Configuración de Firestore

Reglas de seguridad recomendadas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /qr_payments/{transactionId} {
      // Permitir lectura y escritura desde el servidor
      // En producción, implementar autenticación
      allow read, write: if true;
    }
  }
}
```

## 🧪 Testing

### Probar Generación de QR
```bash
curl -X POST https://tu-backend.vercel.app/api/payments/generate \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Test"}'
```

### Probar Validación
```bash
curl -X POST https://tu-backend.vercel.app/api/payments/validate \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "uuid-aqui", "userId": "test-user"}'
```

## 💡 Próximos Pasos

1. **Integra el endpoint de validación** en tu app SAMUEL
2. **Configura el sistema de puntos** para otorgar recompensas
3. **Personaliza el Dashboard** con tu branding
4. **Implementa autenticación** para mayor seguridad
5. **Agrega notificaciones** push al completar pagos

## 📞 Soporte

- Verifica logs en: https://vercel.com/dashboard
- Firestore Console: https://console.firebase.google.com/
- API Health Check: `https://tu-backend.vercel.app/api/health`

## 📄 Licencia

MIT

---

**¡Sistema listo para integrar con SAMUEL Rewards!** 🎉
