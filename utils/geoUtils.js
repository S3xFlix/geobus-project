// utils/geoUtils.js
function validarCoordenadas(coord) {
  return Array.isArray(coord) && 
         coord.length === 2 && 
         !isNaN(coord[0]) && 
         !isNaN(coord[1]) &&
         Math.abs(coord[0]) <= 180 &&
         Math.abs(coord[1]) <= 90;
}

function calcularDistancia(coord1, coord2) {
  if (!validarCoordenadas(coord1)) throw new Error('Coordenada 1 inválida');
  if (!validarCoordenadas(coord2)) throw new Error('Coordenada 2 inválida');

  const [lon1, lat1] = coord1.map(deg => deg * Math.PI / 180);
  const [lon2, lat2] = coord2.map(deg => deg * Math.PI / 180);

  // Fórmula Haversine corregida
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) ** 2;
  
  return 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // En metros
}

function encontrarConexionesCercanas(coordOrigen, paradas, radioMetros = 500) {
  if (!validarCoordenadas(coordOrigen)) throw new Error('Coordenada origen inválida');
  
  return paradas
    .filter(p => p.coordenadas && validarCoordenadas(p.coordenadas))
    .map(p => ({
      ...p,
      distancia: calcularDistancia(coordOrigen, p.coordenadas)
    }))
    .filter(p => p.distancia <= radioMetros)
    .sort((a, b) => a.distancia - b.distancia);
}

module.exports = {
  calcularDistancia,
  encontrarConexionesCercanas,
  validarCoordenadas
};