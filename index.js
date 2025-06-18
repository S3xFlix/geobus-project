import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rutasRouter from './routes/rutas.js';
import horariosRouter from './routes/horarios.js';

// Configuración de variables de entorno
dotenv.config();

// Inicialización de Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/rutas', rutasRouter);
app.use('/api/horarios', horariosRouter);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB conectado correctamente'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicio del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});