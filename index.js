import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rutasRouter from './routes/rutas.js';
import horariosRouter from './routes/horarios.js';
import helmet from 'helmet'; // Seguridad adicional
import rateLimit from 'express-rate-limit'; // Protección contra ataques DDoS
import compression from 'compression'; // Compresión de respuestas

// Configuración inicial
dotenv.config();

// Validación de variables críticas mejorada
const requiredEnvVars = ['MONGO_URI', 'NODE_ENV'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error(`❌ Error: Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
  process.exit(1);
}

const app = express();

// Configuración de seguridad avanzada
app.use(helmet());
app.use(compression());

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde'
});

// Aplicar a todas las rutas
app.use(limiter);

// Configuración CORS mejorada
const corsOptions = {
  origin: [
    'https://geobus.onrender.com',
    'http://localhost:3000',
    process.env.FRONTEND_URL // Variable opcional para otros entornos
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar pre-flight para todas las rutas

// Middlewares esenciales
app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware de logger mejorado
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Rutas API
app.use('/api/rutas', rutasRouter);
app.use('/api/horarios', horariosRouter);

// Ruta de verificación de salud mejorada
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = dbStatus === 1 ? 'healthy' : 'degraded';
  
  res.status(dbStatus === 1 ? 200 : 503).json({
    status,
    database: dbStatus === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date(),
    version: process.env.npm_package_version
  });
});

// Ruta base con documentación básica
app.get('/', (req, res) => {
  res.json({
    message: 'API GeoBus Backend',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    documentation: 'https://github.com/tu-repo/geobus-backend',
    endpoints: {
      rutas: {
        path: '/api/rutas',
        methods: ['GET', 'POST']
      },
      horarios: {
        path: '/api/horarios',
        methods: ['GET', 'POST']
      },
      health: {
        path: '/api/health',
        methods: ['GET']
      }
    }
  });
});

// Manejo de errores global mejorado
app.use((err, req, res, next) => {
  console.error('⚠️ Error no manejado:', {
    error: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Error interno del servidor' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});

// Ruta para manejar 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    suggestion: 'Verifica la documentación en /'
  });
});

// Conexión a MongoDB con reconexión automática
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });
    
    console.log('✅ MongoDB conectado exitosamente');
    
    // Manejo de eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('📌 MongoDB conectado');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de conexión a MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado. Intentando reconectar...');
      setTimeout(connectDB, 5000);
    });
    
  } catch (err) {
    console.error('❌ Error inicial de conexión a MongoDB:', err.message);
    process.exit(1);
  }
};

// Inicio seguro del servidor con manejo de errores
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });

    // Manejo de errores del servidor
    server.on('error', (err) => {
      console.error('❌ Error del servidor:', err);
      process.exit(1);
    });

    // Manejo de cierre elegante
    const shutdown = async () => {
      console.log('🛑 Recibida señal de apagado. Cerrando servidor...');
      
      try {
        await new Promise((resolve) => server.close(resolve));
        await mongoose.connection.close(false);
        console.log('🔌 Conexiones cerradas. Servidor detenido.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error durante el cierre:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('unhandledRejection', (err) => {
      console.error('⚠️ Unhandled Rejection:', err);
      shutdown();
    });
    process.on('uncaughtException', (err) => {
      console.error('⚠️ Uncaught Exception:', err);
      shutdown();
    });

  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
};

startServer();