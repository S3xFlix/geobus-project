import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import horariosRouter from './routes/horarios.js';
import rutasRouter from './routes/rutas.js';

// Cargar variables de entorno
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error('❌ Error: MONGO_URI no está definido en el archivo .env');
  process.exit(1);
}

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/horarios', horariosRouter);
app.use('/api/rutas', rutasRouter);

// Ruta base
app.get('/', (req, res) => {
  res.send('🚌 API de GeoBus funcionando correctamente');
});

// Conexión a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (err) {
    console.error('❌ Fallo en la conexión a MongoDB:', err.message);
    process.exit(1);
  }
};

// Iniciar el servidor
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor operativo en puerto ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
};

// Manejo global de errores no atrapados
process.on('unhandledRejection', (err) => {
  console.error('💥 Error no manejado:', err);
  process.exit(1);
});

startServer();
