// routes/horarios.js
import express from 'express';
const router = express.Router();

import Horario from '../models/Horario.js';
import Ruta from '../models/Ruta.js';

// Crear un nuevo horario
router.post('/', async (req, res) => {
  try {
    const horario = new Horario(req.body);
    await horario.save();
    res.status(201).json(horario);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear horario', detalle: err.message });
  }
});

// Obtener todos los horarios
router.get('/', async (req, res) => {
  try {
    const horarios = await Horario.find().populate('rutaId', 'nombre');
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

// Obtener horarios por ID de ruta
router.get('/ruta/:rutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ rutaId: req.params.rutaId });
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios de ruta' });
  }
});

// Obtener horarios por subRutaId
router.get('/subruta/:subRutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ subRutaId: req.params.subRutaId });
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios de subruta' });
  }
});

// Actualizar horario por ID
router.put('/:id', async (req, res) => {
  try {
    const horarioActualizado = await Horario.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!horarioActualizado) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    res.json(horarioActualizado);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar horario', detalle: err.message });
  }
});

// Eliminar horario por ID
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await Horario.findByIdAndDelete(req.params.id);
    if (!resultado) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    res.json({ mensaje: 'Horario eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar horario' });
  }
});

export default router;
