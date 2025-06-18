import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rutasRouter from './routes/rutas.js';
import horariosRouter from './routes/horarios.js';

// Configuración inicial
dotenv.config();

// Validación de variables críticas
if (!process.env.MONGO_URI) {
  console.error('❌ Error: MONGO_URI no está definido en .env');
  process.exit(1);
}

const app = express();

// Middlewares esenciales
app.use(cors({
  origin: ['https://geobus.onrender.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logger para diagnóstico
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuración de rutas
app.use('/api/rutas', rutasRouter);
app.use('/api/horarios', horariosRouter);

// Ruta de verificación de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: 'API GeoBus Backend',
    version: '1.0.0',
    endpoints: {
      rutas: '/api/rutas',
      horarios: '/api/horarios'
    }
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('⚠️ Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Conexión a MongoDB con manejo mejorado
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (err) {
    console.error('❌ Error de conexión a MongoDB:', err.message);
    process.exit(1);
  }
};

// Inicio seguro del servidor
const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  });

  // Manejo de cierre elegante
  process.on('SIGTERM', () => {
    console.log('🛑 Recibido SIGTERM. Cerrando servidor...');
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log('🔌 Conexiones cerradas. Servidor detenido.');
        process.exit(0);
      });
    });
  });
};

startServer();