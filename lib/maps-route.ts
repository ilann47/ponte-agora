export const GOOGLE_MAPS_ROUTE_ORIGIN =
  'Aduana Brasileira da Ponte Internacional da Amizade, Foz do Iguaçu - PR, Brasil';

export const GOOGLE_MAPS_ROUTE_DESTINATION =
  'Aduana Paraguaya, Ciudad del Este, Paraguay';

const routeParams = new URLSearchParams({
  api: '1',
  origin: GOOGLE_MAPS_ROUTE_ORIGIN,
  destination: GOOGLE_MAPS_ROUTE_DESTINATION,
  travelmode: 'driving',
});

export const GOOGLE_MAPS_CROSSING_ROUTE_URL =
  `https://www.google.com/maps/dir/?${routeParams.toString()}`;
