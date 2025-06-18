const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  rutaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ruta',
    required: true
  },
  subRutaId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  subRutaNombre: {
    type: String,
    required: true
  },
  dias: {
    type: [{
      type: String,
      enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    }],
    required: true
  },
  salidas: [{
    type: String, // Formato HH:MM
    required: true
  }],
  tipoHorario: {
    type: String,
    enum: ['normal', 'festivo', 'especial'],
    default: 'normal'
  },
  validoDesde: Date,
  validoHasta: Date,
  notas: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejor performance
horarioSchema.index({ rutaId: 1 });
horarioSchema.index({ subRutaId: 1 });
horarioSchema.index({ dias: 1 });

module.exports = mongoose.model('Horario', horarioSchema);