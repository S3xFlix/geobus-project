import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import horariosRouter from './routes/horarios.js';
import rutasRouter from './routes/rutas.js';

// Configuración inicial
dotenv.config();
const app = express();

// Middlewares esenciales
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/horarios', horariosRouter);
app.use('/api/rutas', rutasRouter);

// Conexión a MongoDB (con manejo mejorado de errores)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (err) {
    console.error('❌ Fallo en conexión a MongoDB:', err.message);
    process.exit(1);
  }
};

// Inicio seguro del servidor
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor operativo en puerto ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
};

startServer();