import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GOOGLE_MAPS_CROSSING_ROUTE_URL,
  GOOGLE_MAPS_ROUTE_DESTINATION,
  GOOGLE_MAPS_ROUTE_ORIGIN,
} from '../lib/maps-route.ts';

test('monta uma rota publica do Google Maps sem chave ou cobranca', () => {
  const route = new URL(GOOGLE_MAPS_CROSSING_ROUTE_URL);

  assert.equal(route.origin, 'https://www.google.com');
  assert.equal(route.pathname, '/maps/dir/');
  assert.equal(route.searchParams.get('api'), '1');
  assert.equal(route.searchParams.get('origin'), GOOGLE_MAPS_ROUTE_ORIGIN);
  assert.equal(route.searchParams.get('destination'), GOOGLE_MAPS_ROUTE_DESTINATION);
  assert.equal(route.searchParams.get('travelmode'), 'driving');
  assert.equal(route.searchParams.has('key'), false);
});
