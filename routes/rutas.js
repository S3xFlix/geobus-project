import express from 'express';
import mongoose from 'mongoose';
import Ruta from '../models/Ruta.js';
import Horario from '../models/Horario.js';
import {
  calcularDistancia,
  encontrarConexionesCercanas,
  validarCoordenadas
} from '../utils/geoUtils.js';

const router = express.Router();

// Validación de ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Logger para rutas
router.use((req, res, next) => {
  console.log(`[RUTAS] ${req.method} ${req.path}`);
  next();
});

// Helper para manejo de errores
const handleError = (res, error, context) => {
  console.error(`Error en ${context}:`, error);
  res.status(500).json({
    error: `Error al ${context}`,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * @api {get} /api/rutas Obtener todas las rutas
 * @apiName GetRutas
 * @apiGroup Rutas
 */
router.get('/', async (req, res) => {
  try {
    console.log('Consultando todas las rutas...');
    
    const rutas = await Ruta.find({}, {
      _id: 1,
      nombre: 1,
      empresa: 1,
      activa: 1,
      subRutas: 1
    })
    .sort({ nombre: 1 })
    .lean()
    .exec();

    if (!rutas || rutas.length === 0) {
      console.warn('No se encontraron rutas en la base de datos');
      return res.status(200).json([]);
    }

    console.log(`Devolviendo ${rutas.length} rutas`);
    res.json(rutas);

  } catch (error) {
    handleError(res, error, 'obtener rutas');
  }
});

/**
 * @api {get} /api/rutas/:id Obtener detalles de ruta
 * @apiName GetRuta
 * @apiGroup Rutas
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Consultando ruta con ID: ${id}`);

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const ruta = await Ruta.findById(id)
      .populate({
        path: 'horarios',
        select: 'subRutaId subRutaNombre dias salidas tipoHorario',
        options: { lean: true }
      })
      .lean();

    if (!ruta) {
      console.warn(`Ruta no encontrada para ID: ${id}`);
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const horariosAgrupados = ruta.horarios?.reduce((acc, horario) => {
      const key = horario.subRutaId?.toString() || 'general';
      acc[key] = acc[key] || [];
      acc[key].push(horario);
      return acc;
    }, {});

    const response = {
      ...ruta,
      horarios: horariosAgrupados || {}
    };

    console.log(`Devolviendo detalles para ruta: ${ruta.nombre}`);
    res.json(response);

  } catch (error) {
    handleError(res, error, `obtener ruta ${req.params.id}`);
  }
});

/**
 * @api {get} /api/rutas/:id/paradas Obtener paradas de ruta
 * @apiName GetParadasRuta
 * @apiGroup Rutas
 */
router.get('/:id/paradas', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Consultando paradas para ruta ID: ${id}`);

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const ruta = await Ruta.findById(id)
      .populate({
        path: 'horarios',
        select: 'subRutaId dias salidas',
        options: { lean: true }
      })
      .lean();

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const paradas = ruta.features
      ?.filter(f => f.geometry?.type === "Point")
      .map(f => {
        const parada = {
          id: f.properties?.id || f._id.toString(),
          nombre: f.properties?.name || 'Parada sin nombre',
          coordenadas: f.geometry.coordinates,
          horarios: {}
        };

        ruta.subRutas?.forEach(subRuta => {
          const horariosSubRuta = ruta.horarios
            ?.filter(h => h.subRutaId?.toString() === subRuta._id.toString());

          if (horariosSubRuta?.length > 0) {
            parada.horarios[subRuta.nombre] = horariosSubRuta;
          }
        });

        return parada;
      }) || [];

    console.log(`Encontradas ${paradas.length} paradas para ruta ID: ${id}`);
    res.json(paradas);

  } catch (error) {
    handleError(res, error, `obtener paradas de ruta ${req.params.id}`);
  }
});

/**
 * @api {get} /api/rutas/:rutaId/conexiones/:paradaId Buscar conexiones cercanas
 * @apiName GetConexiones
 * @apiGroup Rutas
 */
router.get('/:rutaId/conexiones/:paradaId', async (req, res) => {
  try {
    const { rutaId, paradaId } = req.params;
    const distanciaMaxima = Number(req.query.distancia) || 500;
    
    console.log(`Buscando conexiones para parada ${paradaId} en ruta ${rutaId}`);

    if (!isValidId(rutaId)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const rutaOrigen = await Ruta.findById(rutaId)
      .populate('horarios')
      .lean();

    if (!rutaOrigen) {
      return res.status(404).json({ error: 'Ruta origen no encontrada' });
    }

    const paradaOrigen = rutaOrigen.features
      ?.find(f => f.geometry?.type === "Point" && 
        (f.properties?.id === paradaId || f._id.toString() === paradaId));

    if (!paradaOrigen) {
      return res.status(404).json({ error: 'Parada no encontrada' });
    }

    const otrasRutas = await Ruta.find({ _id: { $ne: rutaId } })
      .populate('horarios')
      .lean();

    const conexiones = [];

    for (const ruta of otrasRutas) {
      for (const feature of ruta.features || []) {
        if (feature.geometry?.type === "Point") {
          const distancia = calcularDistancia(
            paradaOrigen.geometry.coordinates,
            feature.geometry.coordinates
          );

          if (distancia <= distanciaMaxima) {
            const horariosParada = ruta.horarios?.map(horario => ({
              subRutaNombre: horario.subRutaNombre,
              dias: horario.dias,
              salidas: horario.salidas
            })) || [];

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

    console.log(`Encontradas ${conexiones.length} conexiones`);
    res.json({
      paradaOrigen: {
        id: paradaId,
        nombre: paradaOrigen.properties?.name || 'Parada sin nombre',
        coordenadas: paradaOrigen.geometry.coordinates,
        horarios: rutaOrigen.horarios || []
      },
      conexiones
    });

  } catch (error) {
    handleError(res, error, 'buscar conexiones');
  }
});

/**
 * @api {get} /api/rutas/:id/subrutas Obtener subrutas con horarios
 * @apiName GetSubrutas
 * @apiGroup Rutas
 */
router.get('/:id/subrutas', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Consultando subrutas para ruta ID: ${id}`);

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'ID de ruta inválido' });
    }

    const ruta = await Ruta.findById(id)
      .populate({
        path: 'horarios',
        select: 'subRutaId subRutaNombre dias salidas tipoHorario',
        options: { lean: true }
      })
      .lean();

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const subRutasConHorarios = ruta.subRutas?.map(subRuta => {
      const horarios = ruta.horarios
        ?.filter(h => h.subRutaId?.toString() === subRuta._id.toString()) || [];

      return {
        ...subRuta,
        horarios
      };
    }) || [];

    console.log(`Encontradas ${subRutasConHorarios.length} subrutas`);
    res.json(subRutasConHorarios);

  } catch (error) {
    handleError(res, error, `obtener subrutas de ruta ${req.params.id}`);
  }
});

export default router;