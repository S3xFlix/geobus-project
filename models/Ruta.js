import mongoose from 'mongoose';

const subRutaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  }
}, { _id: true });

const featureSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'LineString'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  properties: {
    name: String,
    description: String,
    id: String
  }
});

const rutaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  empresa: {
    type: String,
    trim: true
  },
  subRutas: [subRutaSchema],
  features: [featureSchema],
  horarios: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horario'
  }],
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Índices para mejor performance
rutaSchema.index({ nombre: 1 });
rutaSchema.index({ 'subRutas._id': 1 });
rutaSchema.index({ activa: 1 });

export default mongoose.model('Ruta', rutaSchema);