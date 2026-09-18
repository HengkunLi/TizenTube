const SUBSCRIPTION_PROPERTY_NAMES = new Set([
  'subscribebutton',
  'subscribebuttonrenderer',
  'subscriptionbutton',
  'subscriptionbuttonrenderer',
]);

const BUTTON_RENDERER_NAMES = new Set([
  'buttonrenderer',
  'compactlinkrenderer',
  'togglebuttonrenderer',
]);

function hasSubscriptionEndpoint(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 12) return false;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (normalized === 'subscribeendpoint' || normalized === 'unsubscribeendpoint') return true;
    if (hasSubscriptionEndpoint(child, depth + 1)) return true;
  }
  return false;
}

function isSubscriptionControl(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase();
    return SUBSCRIPTION_PROPERTY_NAMES.has(normalized)
      || (BUTTON_RENDERER_NAMES.has(normalized) && hasSubscriptionEndpoint(child));
  });
}

function isShortsContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.reelItemRenderer || value.reelShelfRenderer || value.reelWatchEndpoint) return true;

  const shelfType = value.shelfRenderer?.tvhtml5ShelfRendererType;
  if (shelfType === 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS') return true;

  const tile = value.tileRenderer;
  if (tile?.tvhtml5ShelfRendererType === 'TVHTML5_TILE_RENDERER_TYPE_SHORTS'
    || tile?.onSelectCommand?.reelWatchEndpoint) return true;

  const lockup = value.lockupViewModel;
  if (lockup?.contentType === 'LOCKUP_CONTENT_TYPE_SHORT'
    || lockup?.rendererContext?.commandContext?.onTap?.innertubeCommand?.reelWatchEndpoint) return true;

  const browseId = value.guideEntryRenderer?.navigationEndpoint?.browseEndpoint?.browseId;
  return browseId === 'FEshorts' || browseId === 'FEreel';
}

export function removeShortsContent(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 30) return value;
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index--) {
      if (isShortsContent(value[index])) value.splice(index, 1);
      else removeShortsContent(value[index], depth + 1);
    }
    return value;
  }
  for (const child of Object.values(value)) {
    removeShortsContent(child, depth + 1);
  }
  return value;
}

export function removeSubscriptionControls(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 30) return value;

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index--) {
      if (isSubscriptionControl(value[index])) value.splice(index, 1);
      else removeSubscriptionControls(value[index], depth + 1);
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    const normalized = key.toLowerCase();
    if (SUBSCRIPTION_PROPERTY_NAMES.has(normalized)
      || (BUTTON_RENDERER_NAMES.has(normalized) && hasSubscriptionEndpoint(value[key]))) {
      delete value[key];
    } else {
      removeSubscriptionControls(value[key], depth + 1);
    }
  }
  return value;
}

export function responseBrowseId(response) {
  const services = response?.responseContext?.serviceTrackingParams;
  if (!Array.isArray(services)) return null;
  for (const service of services) {
    const browseId = service?.params?.find(param => param?.key === 'browse_id')?.value;
    if (browseId) return browseId;
  }
  return null;
}

function clearRecommendationContainer(container) {
  const sectionList = container?.sectionListRenderer;
  if (Array.isArray(sectionList?.contents)) {
    sectionList.contents = sectionList.contents.filter(item =>
      !item?.shelfRenderer
      && !item?.richShelfRenderer
      && !item?.reelShelfRenderer
    );
    sectionList.continuations = [];
  }

  const grid = container?.gridRenderer;
  if (Array.isArray(grid?.items)) {
    grid.items = [];
    grid.continuations = [];
  }
}

export function removeHomeRecommendations(response) {
  if (responseBrowseId(response) !== 'FEtopics') return response;

  const surface = response?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer;
  clearRecommendationContainer(surface?.content);
  clearRecommendationContainer(response?.contents);
  return response;
}

export function applyContentRestrictions(response, options) {
  if (!response || typeof response !== 'object') return response;
  if (options?.hideShorts) removeShortsContent(response);
  if (options?.hideHomeRecommendations) removeHomeRecommendations(response);
  if (options?.hideSubscribeButtons) removeSubscriptionControls(response);
  return response;
}
