const mongoose = require('mongoose');

const FeatureSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['LineString', 'Point'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  properties: {
    type: Object
  }
}, { _id: false });

const SubRutaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  descripcion: String,
  // Puedes añadir más campos específicos de cada subruta
  direccion: {
    type: String,
    enum: ['ida', 'vuelta', 'circular'],
    required: true
  }
}, { _id: false });

const RutaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['FeatureCollection'],
    default: 'FeatureCollection'
  },
  features: {
    type: [FeatureSchema],
    default: []
  },
  subRutas: [SubRutaSchema],
  // Campos adicionales para todas las rutas
  activa: {
    type: Boolean,
    default: true
  },
  empresa: String,
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, { 
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Referencia virtual a los horarios
RutaSchema.virtual('horarios', {
  ref: 'Horario',
  localField: '_id',
  foreignField: 'rutaId',
  justOne: false
});

module.exports = mongoose.model('Ruta', RutaSchema);