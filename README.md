# FinZen AI - Aplicación de Finanzas Personales con IA

FinZen AI es una aplicación web de finanzas personales diseñada específicamente para la Generación Z en Latinoamérica, con un asistente de IA llamado Zenio como núcleo de interacción.

## 🚀 Características

- **Autenticación segura** con verificación de email vía SendGrid
- **Gestión de transacciones** (ingresos y gastos)
- **Presupuestos mensuales** con seguimiento
- **Asistente IA Zenio** integrado con OpenAI
- **Interfaz moderna** con shadcn/ui
- **API RESTful** con Node.js y Express
- **Base de datos PostgreSQL** con Prisma ORM

## 📋 Requisitos Previos

- Node.js 18+ 
- pnpm
- Cuenta en Railway (para base de datos PostgreSQL)
- Cuenta en SendGrid (para emails)
- Cuenta en OpenAI (para el asistente Zenio)

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd FinZenAI_Project_Cursor
```

### 2. Instalar dependencias del Backend
```bash
cd backend
pnpm install
```

### 3. Instalar dependencias del Frontend
```bash
cd ../frontend
pnpm install
```

## ⚙️ Configuración

### 1. Configurar Base de Datos (Railway)

1. Ve a [Railway](https://railway.app/)
2. Crea una nueva cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Agrega un servicio PostgreSQL
5. Copia la URL de conexión

### 2. Configurar SendGrid

1. Ve a [SendGrid](https://sendgrid.com/)
2. Crea una cuenta
3. Genera una API Key
4. Verifica tu dominio de email

### 3. Configurar OpenAI

1. Ve a [OpenAI](https://platform.openai.com/)
2. Crea una cuenta
3. Genera una API Key
4. Crea un asistente y copia su ID

### 4. Configurar Variables de Entorno

En la carpeta `backend`, copia el archivo de ejemplo:
```bash
cp env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
# Configuración del servidor
PORT=3001
NODE_ENV=development

# Base de datos PostgreSQL (Railway)
DATABASE_URL="postgresql://username:password@host:port/database"

# JWT Secret (genera uno seguro)
JWT_SECRET="tu_jwt_secret_super_seguro_aqui"

# SendGrid para verificación de email
SENDGRID_API_KEY="tu_sendgrid_api_key"
SENDGRID_FROM_EMAIL="noreply@finzenai.com"

# OpenAI para Zenio
OPENAI_API_KEY="tu_openai_api_key"
OPENAI_ASSISTANT_ID="tu_openai_assistant_id"

# Configuración de CORS
CORS_ORIGIN="http://localhost:5173"

# Configuración de la aplicación
APP_NAME="FinZen AI"
APP_VERSION="1.0.0"
```

## 🗄️ Configuración de la Base de Datos

### 1. Generar cliente Prisma
```bash
cd backend
pnpm db:generate
```

### 2. Sincronizar esquema con la base de datos
```bash
pnpm db:push
```

### 3. (Opcional) Crear migración
```bash
pnpm db:migrate
```

## 🚀 Ejecutar el Proyecto

### Backend
```bash
cd backend
pnpm dev
```

El backend estará disponible en: `http://localhost:3001`

### Frontend
```bash
cd frontend
pnpm dev
```

El frontend estará disponible en: `http://localhost:5173`

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/verify-email` - Verificación de email
- `POST /api/auth/forgot-password` - Recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña

### Transacciones
- `GET /api/transactions` - Obtener transacciones
- `GET /api/transactions/:id` - Obtener transacción específica
- `POST /api/transactions` - Crear transacción
- `PUT /api/transactions/:id` - Actualizar transacción
- `DELETE /api/transactions/:id` - Eliminar transacción

### Presupuestos
- `GET /api/budgets` - Obtener presupuestos
- `GET /api/budgets/:id` - Obtener presupuesto específico
- `POST /api/budgets` - Crear presupuesto
- `PUT /api/budgets/:id` - Actualizar presupuesto
- `DELETE /api/budgets/:id` - Eliminar presupuesto

### Zenio (Asistente IA)
- `POST /api/zenio/chat` - Chatear con Zenio
- `GET /api/zenio/history` - Obtener historial de chat

## 🏗️ Estructura del Proyecto

```
FinZenAI_Project_Cursor/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controladores de la API
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Servicios (email, etc.)
│   │   ├── middlewares/     # Middlewares (auth, etc.)
│   │   ├── prisma/          # Esquema de base de datos
│   │   └── app.ts           # Archivo principal
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas de la aplicación
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilidades
│   │   └── App.tsx          # Componente principal
│   ├── public/
│   └── package.json
└── README.md
```

## 🔧 Scripts Disponibles

### Backend
- `pnpm dev` - Ejecutar en modo desarrollo
- `pnpm build` - Compilar para producción
- `pnpm start` - Ejecutar en modo producción
- `pnpm db:generate` - Generar cliente Prisma
- `pnpm db:push` - Sincronizar esquema
- `pnpm db:migrate` - Crear migración
- `pnpm db:studio` - Abrir Prisma Studio

### Frontend
- `pnpm dev` - Ejecutar en modo desarrollo
- `pnpm build` - Compilar para producción
- `pnpm preview` - Vista previa de producción

## 🧪 Testing

```bash
# Backend
cd backend
pnpm test

# Frontend
cd frontend
pnpm test
```

## 📦 Despliegue

### Backend (Railway)
1. Conecta tu repositorio a Railway
2. Configura las variables de entorno
3. Railway detectará automáticamente que es un proyecto Node.js

### Frontend (Vercel)
1. Conecta tu repositorio a Vercel
2. Configura el directorio de build como `frontend`
3. Vercel detectará automáticamente que es un proyecto Vite

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🎯 Roadmap

- [ ] Aplicación móvil (React Native)
- [ ] Notificaciones push
- [ ] Integración con bancos
- [ ] Análisis avanzado de gastos
- [ ] Metas de ahorro
- [ ] Exportación de reportes
- [ ] Múltiples monedas
- [ ] Modo offline

---

**FinZen AI** - Transformando las finanzas personales con IA 🚀 