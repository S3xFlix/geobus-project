require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error conectando a MongoDB:', err));

// Modelos de datos
const RutaSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  color: String,
  geojson: Object,
  horarios: [{
    dias: [String],
    salidas: [String]
  }]
});

const ParadaSchema = new mongoose.Schema({
  nombre: String,
  ubicacion: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  rutas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ruta' }]
});

// Índice geospacial para paradas
ParadaSchema.index({ ubicacion: '2dsphere' });

const Ruta = mongoose.model('Ruta', RutaSchema);
const Parada = mongoose.model('Parada', ParadaSchema);

// Rutas API
app.get('/api/rutas', async (req, res) => {
  try {
    const rutas = await Ruta.find({});
    res.json(rutas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rutas/:id', async (req, res) => {
  try {
    const ruta = await Ruta.findById(req.params.id);
    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.json(ruta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/horarios', async (req, res) => {
  try {
    const rutas = await Ruta.find({}, 'nombre horarios');
    const horarios = rutas.flatMap(ruta => 
      ruta.horarios.map(horario => ({
        ruta: ruta.nombre,
        ...horario.toObject()
      }))
    );
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/paradas', async (req, res) => {
  try {
    const paradas = await Parada.find({}).populate('rutas', 'nombre');
    res.json(paradas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});