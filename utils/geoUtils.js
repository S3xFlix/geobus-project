/**
 * Valida si una coordenada [lon, lat] es válida.
 * @param {number[]} coord
 * @returns {boolean}
 */
export function validarCoordenadas(coord) {
  return Array.isArray(coord) &&
         coord.length === 2 &&
         typeof coord[0] === 'number' &&
         typeof coord[1] === 'number' &&
         !isNaN(coord[0]) && !isNaN(coord[1]) &&
         Math.abs(coord[0]) <= 180 &&
         Math.abs(coord[1]) <= 90;
}

/**
 * Calcula la distancia (en metros) entre dos coordenadas usando la fórmula Haversine.
 * @param {number[]} coord1 - [lon, lat]
 * @param {number[]} coord2 - [lon, lat]
 * @returns {number} distancia en metros
 */
export function calcularDistancia(coord1, coord2) {
  if (!validarCoordenadas(coord1)) throw new Error('Coordenada 1 inválida');
  if (!validarCoordenadas(coord2)) throw new Error('Coordenada 2 inválida');

  const [lon1, lat1] = coord1.map(deg => deg * Math.PI / 180);
  const [lon2, lat2] = coord2.map(deg => deg * Math.PI / 180);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const R = 6371e3; // Radio de la Tierra en metros

  return R * c;
}

/**
 * Retorna una lista de paradas cercanas a una coordenada origen, ordenadas por distancia.
 * @param {number[]} coordOrigen - Coordenada de origen [lon, lat]
 * @param {Array} paradas - Arreglo de objetos con propiedad `coordenadas: [lon, lat]`
 * @param {number} radioMetros - Radio de búsqueda en metros (default: 500)
 * @returns {Array} Paradas cercanas con propiedad `distancia`
 */
export function encontrarConexionesCercanas(coordOrigen, paradas, radioMetros = 500) {
  if (!validarCoordenadas(coordOrigen)) {
    throw new Error('Coordenada origen inválida');
  }

  return paradas
    .filter(p => p.coordenadas && validarCoordenadas(p.coordenadas))
    .map(p => ({
      ...p,
      distancia: calcularDistancia(coordOrigen, p.coordenadas)
    }))
    .filter(p => p.distancia <= radioMetros)
    .sort((a, b) => a.distancia - b.distancia);
}
