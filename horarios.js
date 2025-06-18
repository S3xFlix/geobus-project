import express from 'express';
import Horario from '../models/Horario.js';
import Ruta from '../models/Ruta.js';
import mongoose from 'mongoose';

const router = express.Router();

// Crear nuevo horario
router.post('/', async (req, res) => {
  try {
    const ruta = await Ruta.findById(req.body.rutaId);
    if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });

    let subRutaNombre = '';
    if (ruta.subRutas?.length > 0 && req.body.subRutaId) {
      const subRuta = ruta.subRutas.find(sub => sub._id.toString() === req.body.subRutaId);
      if (!subRuta) return res.status(400).json({ error: 'Subruta no válida' });
      subRutaNombre = subRuta.nombre;
    }

    const horario = new Horario({ ...req.body, subRutaNombre });
    await horario.save();
    res.status(201).json(horario);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear horario', details: error.message });
  }
});

// Obtener todos los horarios
router.get('/', async (req, res) => {
  try {
    const horarios = await Horario.find()
      .populate({ path: 'rutaId', select: 'nombre' })
      .sort({ 'rutaId.nombre': 1, dias: 1 });
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios', details: error.message });
  }
});

// Obtener horarios por ruta
router.get('/ruta/:rutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ 
      rutaId: new mongoose.Types.ObjectId(req.params.rutaId) 
    }).sort({ dias: 1, salidas: 1 });

    horarios.length === 0 
      ? res.status(404).json({ message: 'No hay horarios para esta ruta' })
      : res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios', details: error.message });
  }
});

// Obtener horarios por subruta
router.get('/subruta/:subRutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ subRutaId: req.params.subRutaId })
      .populate({ path: 'rutaId', select: 'nombre' })
      .sort({ dias: 1, salidas: 1 });

    horarios.length === 0
      ? res.status(404).json({ message: 'No hay horarios para esta subruta' })
      : res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios', details: error.message });
  }
});

// Actualizar horario
router.patch('/:id', async (req, res) => {
  try {
    const horarioExistente = await Horario.findById(req.params.id);
    if (!horarioExistente) return res.status(404).json({ error: 'Horario no encontrado' });

    if (req.body.rutaId) {
      const ruta = await Ruta.findById(req.body.rutaId);
      if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
      
      if (req.body.subRutaId && ruta.subRutas?.length > 0) {
        const subRuta = ruta.subRutas.find(sub => sub._id.toString() === req.body.subRutaId);
        if (!subRuta) return res.status(400).json({ error: 'Subruta no válida' });
      }
    }

    const horario = await Horario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(horario);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar horario', details: error.message });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    const horario = await Horario.findByIdAndDelete(req.params.id);
    if (!horario) return res.status(404).json({ error: 'Horario no encontrado' });
    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar horario', details: error.message });
  }
});

// Obtener horarios por día y ruta
router.get('/dia/:dia/ruta/:rutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({
      rutaId: new mongoose.Types.ObjectId(req.params.rutaId),
      dias: req.params.dia
    }).sort({ salidas: 1 });

    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios', details: error.message });
  }
});

export default router;