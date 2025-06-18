const express = require('express');
const router = express.Router();
const Horario = require('../models/Horario');
const Ruta = require('../models/Ruta');
const mongoose = require('mongoose');

// Crear un nuevo horario (soporta rutas sin subrutas)
router.post('/', async (req, res) => {
  try {
    // Verificar que la ruta exista
    const ruta = await Ruta.findById(req.body.rutaId);
    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    // Si hay subrutas, validar subRutaId
    let subRutaNombre = '';
    if (ruta.subRutas && ruta.subRutas.length > 0 && req.body.subRutaId) {
      const subRuta = ruta.subRutas.find(
        sub => sub._id.toString() === req.body.subRutaId
      );
      if (!subRuta) {
        return res.status(400).json({ error: 'Subruta no válida para esta ruta' });
      }
      subRutaNombre = subRuta.nombre;
    }

    const horario = new Horario({
      ...req.body,
      subRutaNombre
    });

    await horario.save();
    res.status(201).json(horario);
  } catch (error) {
    res.status(400).json({
      error: 'Error al crear horario',
      details: error.message
    });
  }
});

// Obtener todos los horarios (con información de ruta)
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

// Obtener horarios por ruta (funciona con o sin subrutas)
router.get('/ruta/:rutaId', async (req, res) => {
  try {
    const rutaObjectId = mongoose.Types.ObjectId(req.params.rutaId);
    const horarios = await Horario.find({ rutaId: rutaObjectId })
      .sort({ dias: 1, salidas: 1 });

    if (horarios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios con los filtros aplicados' });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener horarios', details: error.message });
  }
});

// Obtener horarios por subruta (opcional, solo si usas subrutas)
router.get('/subruta/:subRutaId', async (req, res) => {
  try {
    const horarios = await Horario.find({ subRutaId: req.params.subRutaId })
      .populate({
        path: 'rutaId',
        select: 'nombre'
      })
      .sort({ dias: 1, salidas: 1 });

    if (horarios.length === 0) {
      return res.status(404).json({
        message: 'No se encontraron horarios para esta subruta'
      });
    }

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios',
      details: error.message
    });
  }
});

// Actualizar un horario (validación flexible)
router.patch('/:id', async (req, res) => {
  try {
    const horarioExistente = await Horario.findById(req.params.id);
    if (!horarioExistente) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    // Si se intenta cambiar la ruta o subruta, validar si existen
    if (req.body.rutaId) {
      const ruta = await Ruta.findById(req.body.rutaId);
      if (!ruta) {
        return res.status(404).json({ error: 'Ruta no encontrada' });
      }
      if (req.body.subRutaId && ruta.subRutas && ruta.subRutas.length > 0) {
        const subRuta = ruta.subRutas.find(
          sub => sub._id.toString() === req.body.subRutaId
        );
        if (!subRuta) {
          return res.status(400).json({ error: 'Subruta no válida para esta ruta' });
        }
      }
    }

    const horario = await Horario.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json(horario);
  } catch (error) {
    res.status(400).json({
      error: 'Error al actualizar horario',
      details: error.message
    });
  }
});

// Eliminar un horario
router.delete('/:id', async (req, res) => {
  try {
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
    const rutaObjectId = mongoose.Types.ObjectId(req.params.rutaId);
    const horarios = await Horario.find({
      rutaId: rutaObjectId,
      dias: req.params.dia
    }).sort({ salidas: 1 });

    res.json(horarios);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener horarios',
      details: error.message
    });
  }
});

module.exports = router;