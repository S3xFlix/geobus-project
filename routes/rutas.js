// routes/rutas.js
import express from 'express';
const router = express.Router();

import Ruta from '../models/Ruta.js';
import Horario from '../models/Horario.js';
import {
  calcularDistancia,
  encontrarConexionesCercanas,
  validarCoordenadas
} from '../utils/geoUtils.js';

// Obtener todas las rutas (con información básica)
router.get('/', async (req, res) => {
  try {
    const rutas = await Ruta.find({}, {
      _id: 1,
      nombre: 1,
      subRutas: 1,
      empresa: 1,
      activa: 1
    }).sort({ nombre: 1 });

    res.json(rutas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutas' });
  }
});

// Obtener detalles completos de una ruta (incluyendo horarios)
router.get('/:id', async (req, res) => {
  try {
    const ruta = await Ruta.findById(req.params.id)
      .populate({
        path: 'horarios',
        select: 'subRutaId subRutaNombre dias salidas tipoHorario'
      });

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const response = {
      ...ruta.toObject(),
      geojson: {
        type: ruta.type,
        features: ruta.features
      },
      horarios: ruta.horarios.reduce((acc, horario) => {
        if (!acc[horario.subRutaId]) {
          acc[horario.subRutaId] = [];
        }
        acc[horario.subRutaId].push(horario);
        return acc;
      }, {})
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ruta' });
  }
});

// Obtener paradas de una ruta
router.get('/:id/paradas', async (req, res) => {
  try {
    const ruta = await Ruta.findById(req.params.id)
      .populate({
        path: 'horarios',
        select: 'subRutaId dias salidas'
      });

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const paradas = ruta.features
      .filter(f => f.geometry?.type === "Point")
      .map(f => {
        const parada = {
          id: f.properties?.id || f._id.toString(),
          nombre: f.properties?.name || 'Parada sin nombre',
          coordenadas: f.geometry.coordinates,
          horarios: {}
        };

        ruta.subRutas.forEach(subRuta => {
          const horariosSubRuta = ruta.horarios
            .filter(h => h.subRutaId.toString() === subRuta._id.toString());

          if (horariosSubRuta.length > 0) {
            parada.horarios[subRuta.nombre] = horariosSubRuta;
          }
        });

        return parada;
      });

    res.json(paradas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener paradas' });
  }
});

// Buscar conexiones cercanas entre paradas
router.get('/:rutaId/conexiones/:paradaId', async (req, res) => {
  try {
    const { rutaId, paradaId } = req.params;
    const distanciaMaxima = req.query.distancia || 500;

    const rutaOrigen = await Ruta.findById(rutaId).populate('horarios');

    const paradaOrigen = rutaOrigen.features.find(
      f => f.geometry?.type === "Point" &&
        (f.properties?.id === paradaId || f._id.toString() === paradaId)
    );

    if (!paradaOrigen) {
      return res.status(404).json({ error: 'Parada no encontrada' });
    }

    const otrasRutas = await Ruta.find({ _id: { $ne: rutaId } }).populate('horarios');

    const conexiones = [];

    for (const ruta of otrasRutas) {
      for (const feature of ruta.features) {
        if (feature.geometry?.type === "Point") {
          const distancia = calcularDistancia(
            paradaOrigen.geometry.coordinates,
            feature.geometry.coordinates
          );

          if (distancia <= distanciaMaxima) {
            const horariosParada = ruta.horarios.map(horario => ({
              subRutaNombre: horario.subRutaNombre,
              dias: horario.dias,
              salidas: horario.salidas
            }));

            conexiones.push({
              rutaId: ruta._id,
              rutaNombre: ruta.nombre,
              paradaId: feature.properties?.id || feature._id.toString(),
              paradaNombre: feature.properties?.name || 'Parada sin nombre',
              distancia,
              coordenadas: feature.geometry.coordinates,
              horarios: horariosParada
            });
          }
        }
      }
    }

    conexiones.sort((a, b) => a.distancia - b.distancia);

    res.json({
      paradaOrigen: {
        id: paradaId,
        nombre: paradaOrigen.properties?.name || 'Parada sin nombre',
        coordenadas: paradaOrigen.geometry.coordinates,
        horarios: rutaOrigen.horarios
      },
      conexiones
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar conexiones' });
  }
});

// Obtener subrutas con sus horarios
router.get('/:id/subrutas', async (req, res) => {
  try {
    const ruta = await Ruta.findById(req.params.id)
      .populate({
        path: 'horarios',
        select: 'subRutaId subRutaNombre dias salidas tipoHorario'
      });

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const subRutasConHorarios = ruta.subRutas.map(subRuta => {
      const horarios = ruta.horarios
        .filter(h => h.subRutaId.toString() === subRuta._id.toString());

      return {
        ...subRuta.toObject(),
        horarios
      };
    });

    res.json(subRutasConHorarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener subrutas' });
  }
});

export default router;
