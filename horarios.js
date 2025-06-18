import express from 'express';
import Horario from '../models/Horario.js';
import Ruta from '../models/Ruta.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper para validar ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Crear nuevo horario
router.post('/', async (req, res) => {
  try {
    const { rutaId, subRutaId, ...horarioData } = req.body;

    if (!isValidId(rutaId)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const ruta = await Ruta.findById(rutaId);
    if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });

    let subRutaNombre = '';
    if (subRutaId) {
      const subRuta = ruta.subRutas?.find(s => s._id.toString() === subRutaId);
      if (!subRuta) return res.status(400).json({ error: 'Subruta no válida' });
      subRutaNombre = subRuta.nombre;
    }

    const nuevoHorario = new Horario({
      ...horarioData,
      rutaId,
      subRutaId: subRutaId || null,
      subRutaNombre
    });

    await nuevoHorario.save();
    res.status(201).json(nuevoHorario);
  } catch (error) {
    res.status(500).json({
      error: 'Error al crear horario',
      details: error.message
    });
  }
});

// Obtener todos los horarios
router.get('/', async (req, res) => {
  try {
    const horarios = await Horario.find()
      .populate({
        path: 'rutaId',
        select: 'nombre'
      })
      .sort({ 'rutaId.nombre': 1, dias: 1 });
    
    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios',
      details: error.message
    });
  }
});

// Obtener horarios por ruta
router.get('/ruta/:rutaId', async (req, res) => {
  try {
    if (!isValidId(req.params.rutaId)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const horarios = await Horario.find({ 
      rutaId: new mongoose.Types.ObjectId(req.params.rutaId) 
    }).sort({ dias: 1, salidas: 1 });

    if (horarios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios para esta ruta' });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios por ruta',
      details: error.message
    });
  }
});

// Obtener horarios por subruta
router.get('/subruta/:subRutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ subRutaId: req.params.subRutaId })
      .populate({
        path: 'rutaId',
        select: 'nombre'
      })
      .sort({ dias: 1, salidas: 1 });

    if (horarios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios para esta subruta' });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios por subruta',
      details: error.message
    });
  }
});

// Actualizar horario
router.patch('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID de horario inválido' });
    }

    const { rutaId, subRutaId, ...updateData } = req.body;

    if (rutaId && !isValidId(rutaId)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const horarioExistente = await Horario.findById(req.params.id);
    if (!horarioExistente) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    if (rutaId) {
      const ruta = await Ruta.findById(rutaId);
      if (!ruta) {
        return res.status(404).json({ error: 'Ruta no encontrada' });
      }

      if (subRutaId) {
        const subRuta = ruta.subRutas?.find(
          sub => sub._id.toString() === subRutaId
        );
        if (!subRuta) {
          return res.status(400).json({ error: 'Subruta no válida para esta ruta' });
        }
        updateData.subRutaNombre = subRuta.nombre;
      }
    }

    const horarioActualizado = await Horario.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(horarioActualizado);
  } catch (error) {
    res.status(400).json({
      error: 'Error al actualizar horario',
      details: error.message
    });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID de horario inválido' });
    }

    const horario = await Horario.findByIdAndDelete(req.params.id);
    if (!horario) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error al eliminar horario',
      details: error.message
    });
  }
});

// Obtener horarios por día y ruta
router.get('/dia/:dia/ruta/:rutaId', async (req, res) => {
  try {
    if (!isValidId(req.params.rutaId)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const horarios = await Horario.find({
      rutaId: new mongoose.Types.ObjectId(req.params.rutaId),
      dias: req.params.dia
    }).sort({ salidas: 1 });

    if (horarios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios para este día y ruta' });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios por día y ruta',
      details: error.message
    });
  }
});

export default router;