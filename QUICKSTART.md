# 🚀 Guía Rápida - Deploy en 10 Minutos

## Paso 1: Firebase (5 min)

1. Ve a https://console.firebase.google.com/
2. Click en "Agregar proyecto"
3. Nombre: `samuel-qr-payments`
4. Habilita **Firestore Database** (modo producción)
5. Ubicación: `us-central1`
6. Ve a **Settings > Service Accounts**
7. Click **"Generate New Private Key"**
8. Guarda el archivo JSON

## Paso 2: Subir a GitHub (2 min)

```bash
git init
git add .
git commit -m "Initial commit - QR Payment System"
git remote add origin https://github.com/TU-USUARIO/samuel-qr-backend.git
git push -u origin main
```

## Paso 3: Deploy en Vercel (3 min)

1. Ve a https://vercel.com
2. Login con GitHub
3. Click **"Import Project"**
4. Selecciona tu repositorio
5. Agrega estas **Environment Variables**:

```
FIREBASE_PROJECT_ID = (del JSON descargado)
FIREBASE_CLIENT_EMAIL = (del JSON descargado)
FIREBASE_PRIVATE_KEY = (del JSON descargado - copia TODO incluyendo BEGIN/END)
QR_EXPIRATION_MINUTES = 30
SAMUEL_APP_URL = https://lealtad-three.vercel.app
NODE_ENV = production
```

6. Click **"Deploy"**

## ✅ Verificar que Funciona

1. Ve a `https://tu-proyecto.vercel.app/api/health`
   - Deberías ver: `{"status":"OK",...}`

2. Ve a `https://tu-proyecto.vercel.app/dashboard.html`
   - Genera un QR de prueba
   - Verifica que aparezca la imagen

3. Prueba el API:
```bash
curl https://tu-proyecto.vercel.app/api/payments/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

## 📱 Integrar con SAMUEL

Ver archivo `INTEGRATION_SAMUEL.md` para el código de integración.

Básicamente:
1. Cuando escaneen un QR, llama a:
   `POST /api/payments/validate`
2. Otorga puntos al usuario con la respuesta
3. ¡Listo!

## 🔧 URLs Finales

- API: `https://tu-proyecto.vercel.app/api`
- Dashboard: `https://tu-proyecto.vercel.app/dashboard.html`
- Health: `https://tu-proyecto.vercel.app/api/health`

## 🐛 Troubleshooting

**Error: Firebase no inicializado**
- Verifica las variables de entorno en Vercel
- Asegúrate de copiar la `PRIVATE_KEY` completa con `\n`

**QR no se genera**
- Revisa logs en Vercel Dashboard
- Verifica que Firestore esté habilitado

**CORS Error**
- Ya está configurado para permitir todos los orígenes
- Si persiste, verifica `vercel.json`

---

**¡Listo en 10 minutos!** 🎉
