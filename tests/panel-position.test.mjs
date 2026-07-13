import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadPanelPosition() {
  const context = {
    globalThis: {}
  };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/panel-position.js', 'utf8'), context);
  return context.MlLensPanelPosition;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('places expanded panel near top right by default', () => {
  const panel = loadPanelPosition();
  const state = panel.createDefaultPanelState({ width: 1440, height: 900 });

  assert.deepEqual(plain(state), {
    mode: 'expanded',
    left: 984,
    top: 24
  });
});

test('normalizes collapsed and expanded panel positions inside viewport', () => {
  const panel = loadPanelPosition();

  assert.deepEqual(
    plain(panel.normalizePanelState(
      { mode: 'expanded', left: 2000, top: -20 },
      { width: 1440, height: 900 }
    )),
    { mode: 'expanded', left: 1000, top: 8 }
  );

  assert.deepEqual(
    plain(panel.normalizePanelState(
      { mode: 'collapsed', left: -100, top: 2000 },
      { width: 390, height: 844 }
    )),
    { mode: 'collapsed', left: 8, top: 788 }
  );
});

test('calculates drag position from pointer and offset', () => {
  const panel = loadPanelPosition();

  assert.deepEqual(
    plain(panel.positionFromPointer(
      { clientX: 320, clientY: 120 },
      { x: 40, y: 20 },
      { mode: 'collapsed' },
      { width: 390, height: 844 }
    )),
    { mode: 'collapsed', left: 280, top: 100 }
  );
});

test('keeps small pointer jitter as a tap instead of drag', () => {
  const panel = loadPanelPosition();

  assert.equal(
    panel.isDragMovement({ clientX: 100, clientY: 100 }, { clientX: 104, clientY: 102 }),
    false
  );
  assert.equal(
    panel.isDragMovement({ clientX: 100, clientY: 100 }, { clientX: 109, clientY: 100 }),
    true
  );
});
