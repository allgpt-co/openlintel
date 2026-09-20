import { describe, expect, it } from 'vitest';
import { recordSceneEdit } from './editor-history';

describe('editor history', () => {
  it('undoes an addition to the restored scene, not the original design snapshot', () => {
    const original = [{ id: 'sofa' }];
    const restored = [...original, { id: 'saved-lamp' }];
    const edited = [...restored, { id: 'new-chair' }];
    const history = recordSceneEdit([{ furniture: original }], 0, restored, edited);

    expect(history[0]?.furniture).toEqual(restored);
    expect(history[1]?.furniture).toEqual(edited);
  });

  it('keeps remote changes when recording a new edit after undo and discards the old redo branch', () => {
    const history = [{ furniture: [{ id: 'sofa' }] }, { furniture: [{ id: 'old-redo' }] }];
    const current = [{ id: 'sofa' }, { id: 'remote-chair' }];
    const next = recordSceneEdit(history, 0, current, [...current, { id: 'lamp' }]);

    expect(next).toHaveLength(2);
    expect(next[0]?.furniture).toEqual(current);
    expect(next[1]?.furniture.map(item => item.id)).toEqual(['sofa', 'remote-chair', 'lamp']);
    expect(history[1]?.furniture).toEqual([{ id: 'old-redo' }]);
  });

  it('retains independent snapshots when undoing the removal of the last object', () => {
    const current = [{ id: 'lamp', position: [1, 2, 3] }];
    const history = recordSceneEdit([{ furniture: [] }], 0, current, []);
    current[0]!.position[0] = 99;

    expect(history[0]?.furniture).toEqual([{ id: 'lamp', position: [1, 2, 3] }]);
    expect(history[1]?.furniture).toEqual([]);
  });
});
