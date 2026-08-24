import assert from 'node:assert/strict';
import test from 'node:test';

import { projectNormalizedBox, projectNormalizedPoint } from '../lib/detection-overlay.ts';

test('projeta coordenadas normalizadas no canvas', () => {
  assert.deepEqual(projectNormalizedPoint([0.5, 0.25], 800, 450), [400, 112.5]);
  assert.deepEqual(
    projectNormalizedBox([0.1, 0.2, 0.4, 0.6], 800, 450),
    [80, 90, 320, 270],
  );
});
