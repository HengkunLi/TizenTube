import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterGuideItems,
  mergeGuideOrder,
  reorderGuideItems,
} from '../utils/guideItems.js';

function guideItem(id, extra = {}) {
  return {
    guideEntryRenderer: {
      navigationEndpoint: id === 'search'
        ? { searchEndpoint: {} }
        : { browseEndpoint: { browseId: id } },
      ...extra,
    }
  };
}

test('child-profile entries unknown to an adult order are never dropped', () => {
  const systemEntry = { guideEntryRenderer: { navigationEndpoint: { customEndpoint: {} } } };
  const items = [guideItem('CHILD_HOME'), systemEntry, guideItem('CHILD_LIBRARY')];
  const order = mergeGuideOrder(['ADULT_HOME'], items);
  const result = reorderGuideItems(items, order);

  assert.deepEqual(order, ['ADULT_HOME', 'CHILD_HOME', 'CHILD_LIBRARY']);
  assert.equal(result.length, 3);
  assert.ok(result.includes(systemEntry));
});

test('only explicitly disabled known entries are filtered', () => {
  const systemEntry = { guideEntryRenderer: { navigationEndpoint: { customEndpoint: {} } } };
  const channel = guideItem('CHANNEL', { thumbnail: { thumbnails: [] } });
  const items = [guideItem('HOME'), systemEntry, channel, { otherRenderer: {} }];

  const result = filterGuideItems(items, ['HOME'], true);
  assert.deepEqual(result, [systemEntry, { otherRenderer: {} }]);
});
