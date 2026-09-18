export function guideItemId(item) {
  const renderer = item?.guideEntryRenderer;
  if (!renderer) return null;
  return renderer.navigationEndpoint?.browseEndpoint?.browseId
    || (renderer.navigationEndpoint?.searchEndpoint ? 'search' : null);
}

export function mergeGuideOrder(order, items) {
  const result = Array.isArray(order) ? order.slice() : [];
  const knownIds = new Set(result.map(item =>
    typeof item === 'object' && item !== null ? item.browseId : item
  ));

  for (const item of items || []) {
    const id = guideItemId(item);
    if (id && !knownIds.has(id)) {
      result.push(id);
      knownIds.add(id);
    }
  }
  return result;
}

export function reorderGuideItems(items, order) {
  const remaining = Array.isArray(items) ? items.slice() : [];
  const ordered = [];

  for (const orderItem of Array.isArray(order) ? order : []) {
    const wantedId = typeof orderItem === 'object' && orderItem !== null
      ? orderItem.browseId
      : orderItem;
    const index = remaining.findIndex(item => guideItemId(item) === wantedId);
    if (index !== -1) ordered.push(remaining.splice(index, 1)[0]);
  }

  // Critical safety rule: entries unknown to this TizenTube version are kept
  // in YouTube's original order. Child profiles frequently use different
  // endpoint shapes, and dropping those entries can make navigation unusable.
  return ordered.concat(remaining);
}

export function filterGuideItems(items, disabledIds, disableChannels) {
  const disabled = new Set(Array.isArray(disabledIds) ? disabledIds : []);
  return (items || []).filter(item => {
    const renderer = item?.guideEntryRenderer;
    if (!renderer) return true;
    const id = guideItemId(item);
    if (id && disabled.has(id)) return false;
    if (disableChannels && renderer.thumbnail) return false;
    return true;
  });
}

