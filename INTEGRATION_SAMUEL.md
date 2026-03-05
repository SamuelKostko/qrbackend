# 📱 Código de Integración para App SAMUEL Rewards

## Componente de Escáner QR (React/Next.js)

```javascript
// components/QRScanner.jsx
import { useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QR_BACKEND_URL = 'https://tu-backend.vercel.app/api';

export default function QRScanner({ userId, cardId, onSuccess, onError }) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const startScanner = () => {
    setScanning(true);
    
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    });

    scanner.render(onScanSuccess, onScanError);
  };

  const onScanSuccess = async (decodedText) => {
    setProcessing(true);
    
    try {
      // Parsear el QR escaneado
      const qrData = JSON.parse(decodedText);
      
      // Verificar que sea un QR de pago
      if (qrData.type !== 'payment') {
        throw new Error('Este no es un QR de pago válido');
      }

      // Mostrar confirmación
      const confirmPayment = confirm(
        `¿Confirmar pago de RD$ ${qrData.amount.toFixed(2)}?`
      );

      if (!confirmPayment) {
        setProcessing(false);
        return;
      }

      // Llamar al backend para procesar el pago
      const response = await fetch(`${QR_BACKEND_URL}/payments/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: qrData.transactionId,
          userId: userId,
          cardId: cardId
        })
      });

      const result = await response.json();

      if (result.success) {
        // ✅ Pago exitoso - otorgar puntos
        await grantPointsToUser(userId, result.data.pointsEarned);
        
        onSuccess({
          amount: result.data.amount,
          points: result.data.pointsEarned,
          transactionId: result.data.transactionId
        });
      } else {
        // ❌ Error en el pago
        onError(result.message);
      }
    } catch (error) {
      console.error('Error procesando QR:', error);
      onError(error.message || 'Error procesando el pago');
    } finally {
      setProcessing(false);
      setScanning(false);
    }
  };

  const onScanError = (error) => {
    // Ignorar errores de escaneo continuo
  };

  const grantPointsToUser = async (userId, points) => {
    // Actualizar puntos en tu base de datos (Firebase, Supabase, etc.)
    // Ejemplo con Firebase:
    /*
    const userRef = firebase.firestore().collection('users').doc(userId);
    await userRef.update({
      points: firebase.firestore.FieldValue.increment(points),
      lastTransaction: new Date(),
      transactions: firebase.firestore.FieldValue.arrayUnion({
        type: 'qr_payment',
        points: points,
        timestamp: new Date()
      })
    });
    */
  };

  return (
    <div>
      {!scanning && (
        <button onClick={startScanner}>
          📷 Escanear Código QR
        </button>
      )}

      {scanning && (
        <div>
          <div id="qr-reader" style={{ width: '100%' }}></div>
          {processing && <p>Procesando pago...</p>}
        </div>
      )}
    </div>
  );
}
```

## Uso del Componente

```javascript
// pages/card/[cardId].jsx
import QRScanner from '@/components/QRScanner';
import { useState } from 'react';

export default function CardPage({ user }) {
  const [showScanner, setShowScanner] = useState(false);

  const handlePaymentSuccess = (data) => {
    alert(`¡Pago exitoso!\nMonto: RD$ ${data.amount}\nPuntos ganados: ${data.points}`);
    
    // Actualizar UI con nuevos puntos
    // Recargar balance, etc.
    
    setShowScanner(false);
  };

  const handlePaymentError = (error) => {
    alert(`Error: ${error}`);
    setShowScanner(false);
  };

  return (
    <div>
      <h1>Wallet de Puntos</h1>
      
      <button onClick={() => setShowScanner(true)}>
        Escanear código
      </button>

      {showScanner && (
        <QRScanner
          userId={user.id}
          cardId={user.cardId}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
}
```

## Integración Simple (Sin Componente)

Si prefieres una integración más simple directamente en tu código existente:

```javascript
// En tu archivo donde manejas el escáner QR

const QR_BACKEND_URL = 'https://tu-backend.vercel.app/api';

async function handleQRScanned(qrCodeData) {
  try {
    // 1. Parsear el QR
    const qrPayload = JSON.parse(qrCodeData);
    
    // 2. Validar que sea un QR de pago
    if (qrPayload.type !== 'payment') {
      console.log('QR no es de tipo pago');
      return;
    }

    // 3. Confirmar con el usuario
    const confirm = window.confirm(
      `¿Confirmar pago de RD$ ${qrPayload.amount}?`
    );

    if (!confirm) return;

    // 4. Procesar el pago
    const response = await fetch(`${QR_BACKEND_URL}/payments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: qrPayload.transactionId,
        userId: getCurrentUserId(),
        cardId: getCurrentCardId()
      })
    });

    const result = await response.json();

    // 5. Manejar respuesta
    if (result.success) {
      // ✅ Pago exitoso
      console.log('Pago exitoso:', result.data);
      
      // Otorgar puntos
      await updateUserPoints(result.data.pointsEarned);
      
      // Mostrar mensaje
      showSuccessMessage(`¡Pago exitoso! +${result.data.pointsEarned} puntos`);
    } else {
      // ❌ Error
      showErrorMessage(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('Error procesando el pago');
  }
}
```

## Función para Actualizar Puntos (Firebase)

```javascript
import { getFirestore, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

async function updateUserPoints(points) {
  const db = getFirestore();
  const userRef = doc(db, 'users', getCurrentUserId());

  await updateDoc(userRef, {
    points: increment(points),
    totalEarned: increment(points),
    lastTransaction: new Date(),
    transactions: arrayUnion({
      type: 'qr_payment',
      points: points,
      timestamp: new Date(),
      source: 'qr_scan'
    })
  });

  // Actualizar UI local
  refreshUserData();
}
```

## Manejar Diferentes Estados

```javascript
async function processPayment(transactionId, userId, cardId) {
  try {
    const response = await fetch(`${QR_BACKEND_URL}/payments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, userId, cardId })
    });

    const result = await response.json();

    if (result.success) {
      // ✅ Pago exitoso
      return {
        status: 'success',
        data: result.data
      };
    } else {
      // Manejar diferentes tipos de error
      if (result.message.includes('expirado')) {
        return {
          status: 'expired',
          message: 'Este código QR ha expirado'
        };
      } else if (result.message.includes('utilizado')) {
        return {
          status: 'used',
          message: 'Este código QR ya fue utilizado'
        };
      } else {
        return {
          status: 'error',
          message: result.message
        };
      }
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'Error de conexión'
    };
  }
}
```

## UI de Confirmación Mejorada

```javascript
// components/PaymentConfirmation.jsx
export default function PaymentConfirmation({ amount, onConfirm, onCancel }) {
  return (
    <div className="payment-modal">
      <h2>Confirmar Pago</h2>
      <div className="amount">
        RD$ {amount.toFixed(2)}
      </div>
      <p>Ganarás {Math.floor(amount)} puntos</p>
      
      <div className="buttons">
        <button onClick={onConfirm} className="btn-confirm">
          ✅ Confirmar
        </button>
        <button onClick={onCancel} className="btn-cancel">
          ❌ Cancelar
        </button>
      </div>
    </div>
  );
}
```

## Mensajes de Resultado

```javascript
// components/PaymentResult.jsx
export default function PaymentResult({ result, onClose }) {
  if (result.status === 'success') {
    return (
      <div className="result-success">
        <div className="icon">✅</div>
        <h2>¡Pago Exitoso!</h2>
        <p className="amount">RD$ {result.data.amount}</p>
        <p className="points">+{result.data.pointsEarned} puntos</p>
        <button onClick={onClose}>Cerrar</button>
      </div>
    );
  }

  return (
    <div className="result-error">
      <div className="icon">❌</div>
      <h2>Error</h2>
      <p>{result.message}</p>
      <button onClick={onClose}>Cerrar</button>
    </div>
  );
}
```

## Testing

### Test Manual en Console del Navegador

```javascript
// Simular un QR de pago
const testQR = {
  type: 'payment',
  transactionId: 'test-uuid-123',
  amount: 100,
  merchantId: 'SAMUEL_DEFAULT',
  timestamp: new Date().toISOString()
};

// Convertir a string (como vendría del QR)
const qrString = JSON.stringify(testQR);

// Probar tu función
handleQRScanned(qrString);
```

## Variables de Entorno

Crea un archivo `.env.local` en tu proyecto SAMUEL:

```env
NEXT_PUBLIC_QR_BACKEND_URL=https://tu-backend.vercel.app/api
```

Úsalo así:

```javascript
const QR_BACKEND_URL = process.env.NEXT_PUBLIC_QR_BACKEND_URL;
```

## Checklist de Integración

- [ ] Instalar dependencias del escáner QR
- [ ] Crear componente QRScanner
- [ ] Configurar variable de entorno con URL del backend
- [ ] Implementar función de validación de pago
- [ ] Implementar función para otorgar puntos
- [ ] Crear UI de confirmación
- [ ] Crear UI de resultado
- [ ] Manejar estados de error (expirado, usado, etc.)
- [ ] Probar flujo completo
- [ ] Deploy y verificar en producción

## 🚀 ¡Listo para Integrar!

Con este código, tu app SAMUEL podrá:
1. Escanear QR de pago
2. Validar la transacción
3. Otorgar puntos automáticamente
4. Mostrar confirmaciones al usuario
