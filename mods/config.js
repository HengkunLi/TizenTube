const CONFIG_KEY = 'ytaf-configuration';
const PROFILE_CONFIG_KEY = 'ytaf-profile-configuration';
const PROFILE_CONFIG_VERSION = 1;

// These settings describe what is visible to a viewer, so they belong to the
// active YouTube account instead of the TV as a whole. Other TizenTube settings
// intentionally keep their existing device-wide behaviour.
const profileScopedKeys = new Set([
  'enableShorts',
  'hideRelatedVideosPlayer',
  'hideHomeRecommendations',
  'hideSubscribeButtons',
  'disabledSidebarContents',
  'sidebarContentsOrder',
  'disableChannelsOnSidebar',
]);

const defaultConfig = {
  enableAdBlock: true,
  enableSponsorBlock: true,
  enableSponsorBlockToasts: true,
  sponsorBlockManualSkips: ['intro', 'outro', 'filler'],
  enableSponsorBlockSponsor: true,
  enableSponsorBlockIntro: true,
  enableSponsorBlockOutro: true,
  enableSponsorBlockInteraction: true,
  enableSponsorBlockSelfPromo: true,
  enableSponsorBlockPreview: true,
  enableSponsorBlockMusicOfftopic: true,
  enableSponsorBlockFiller: false,
  enableSponsorBlockHighlight: true,
  videoSpeed: 1,
  preferredVideoQuality: 'auto',
  enableDeArrow: true,
  enableDeArrowThumbnails: false,
  focusContainerColor: '#0f0f0f',
  routeColor: '#0f0f0f',
  enableFixedUI: (window.h5vcc) ? false : true,
  enableHqThumbnails: false,
  enableChapters: true,
  enableLongPress: true,
  enableShorts: true,
  dontCheckUpdateUntil: 0,
  enableWhoIsWatchingMenu: false,
  permanentlyEnableWhoIsWatchingMenu: false,
  enableWhosWatchingMenuOnAppExit: false,
  enableShowUserLanguage: true,
  enableShowOtherLanguages: false,
  showWelcomeToast: true,
  enablePreviousNextButtons: true,
  enableSuperThanksButton: false,
  enableAIAskButton: false,
  enableSpeedControlsButton: true,
  enablePatchingVideoPlayer: true,
  enableMPButton: true,
  enableSwapMPWithPIP: false,
  enablePreviews: true,
  enableHideWatchedVideos: false,
  hideWatchedVideosThreshold: 80,
  hideWatchedVideosPages: [],
  enableHideEndScreenCards: false,
  enableYouThereRenderer: true,
  lastAnnouncementCheck: 0,
  enableScreenDimming: false,
  dimmingTimeout: 60,
  dimmingOpacity: 0.5,
  enablePaidPromotionOverlay: true,
  speedSettingsIncrement: 0.25,
  videoPreferredCodec: 'any',
  launchToOnStartup: null,
  reloadHomeOnStartup: true,
  disabledSidebarContents: [],
  sidebarContentsOrder: [],
  disableChannelsOnSidebar: false,
  enableUpdater: true,
  autoFrameRate: false,
  autoFrameRatePauseVideoFor: 0,
  enableSigninReminder: false,
  sortSubscriptionsByAlphabet: false,
  enableClock: false,
  isClock12HourFormat: false,
  clockShowSeconds: false,
  clockHideWhenVideoPlaying: false,
  disableEnlargingThumbnails: false,
  enableShrinkingThumbnails: false,
  hideRelatedVideosPlayer: false,
  hideHomeRecommendations: false,
  hideSubscribeButtons: false,
};

let localConfig;
let profileConfig;
let activeProfileId = null;

function cloneValue(value) {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function readStoredObject(key, fallback) {
  const storedValue = window.localStorage[key];
  if (storedValue === undefined || storedValue === null || storedValue === '') {
    return cloneValue(fallback);
  }
  try {
    const value = JSON.parse(storedValue);
    return value && typeof value === 'object' ? value : cloneValue(fallback);
  } catch (err) {
    console.warn(`Config read failed for ${key}:`, err);
    return cloneValue(fallback);
  }
}

localConfig = readStoredObject(CONFIG_KEY, defaultConfig);
profileConfig = readStoredObject(PROFILE_CONFIG_KEY, {
  version: PROFILE_CONFIG_VERSION,
  profiles: {},
});

if (!profileConfig.profiles || typeof profileConfig.profiles !== 'object') {
  profileConfig = { version: PROFILE_CONFIG_VERSION, profiles: {} };
}

function saveProfileConfig() {
  window.localStorage[PROFILE_CONFIG_KEY] = JSON.stringify(profileConfig);
}

function getActiveProfileConfig(create = false) {
  if (!activeProfileId) return null;
  if (!profileConfig.profiles[activeProfileId] && create) {
    profileConfig.profiles[activeProfileId] = {};
  }
  return profileConfig.profiles[activeProfileId] || null;
}

export function setActiveProfileId(profileId) {
  const normalizedId = profileId ? String(profileId) : null;
  if (normalizedId === activeProfileId) return false;

  const previousProfileId = activeProfileId;
  activeProfileId = normalizedId;
  configChangeEmitter.dispatchEvent(new CustomEvent('configChange', {
    detail: {
      key: 'activeProfileId',
      value: activeProfileId,
      previousValue: previousProfileId,
    }
  }));
  return true;
}

export function getActiveProfileId() {
  return activeProfileId;
}

export function configRead(key) {
  if (activeProfileId && profileScopedKeys.has(key)) {
    const currentProfile = getActiveProfileConfig(true);
    if (currentProfile[key] === undefined) {
      // Copy, rather than reference, arrays from the old global configuration.
      // Sidebar code mutates arrays before writing them back.
      currentProfile[key] = cloneValue(
        localConfig[key] === undefined ? defaultConfig[key] : localConfig[key]
      );
      saveProfileConfig();
    }
    return currentProfile[key];
  }

  if (localConfig[key] === undefined) {
    console.warn('Populating key', key, 'with default value', defaultConfig[key]);
    localConfig[key] = defaultConfig[key];
  }

  return localConfig[key];
}

export function configWrite(key, value) {
  console.info('Setting key', key, 'to', value);

  if (activeProfileId && profileScopedKeys.has(key)) {
    const currentProfile = getActiveProfileConfig(true);
    currentProfile[key] = cloneValue(value);
    saveProfileConfig();
    configChangeEmitter.dispatchEvent(new CustomEvent('configChange', {
      detail: { key, value: currentProfile[key], profileId: activeProfileId }
    }));
    return;
  }

  localConfig[key] = value;
  window.localStorage[CONFIG_KEY] = JSON.stringify(localConfig);
  configChangeEmitter.dispatchEvent(new CustomEvent('configChange', { detail: { key, value } }));
}

export const configChangeEmitter = {
  listeners: {},
  addEventListener(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  },
  removeEventListener(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  },
  dispatchEvent(event) {
    const type = event.type;
    if (!this.listeners[type]) return;
    this.listeners[type].forEach(cb => {
      try {
        cb.call(this, event)
      } catch (_) {};
    });
  }
};
