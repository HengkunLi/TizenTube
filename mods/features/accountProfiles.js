import { getActiveProfileId, setActiveProfileId } from '../config.js';

const RETRY_DELAY_MS = 250;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getIdentityService() {
  const registry = Object.values(window._yttv || {}).find(value => value && value.mappings);
  return registry?.mappings?.get('CurrentIdentityService');
}

export function profileIdFromIdentity(identity) {
  if (!identity || typeof identity !== 'object') return 'signed-out';

  // effectiveObfuscatedGaiaId distinguishes normal, brand and child profiles.
  // It is the same identifier YouTube itself uses for account-specific local
  // state, without storing an email address or an OAuth credential.
  return String(
    identity.effectiveObfuscatedGaiaId
    || identity.ownerObfuscatedGaiaId
    || identity.identityType
    || 'signed-out'
  );
}

async function readCurrentProfileId() {
  const service = getIdentityService();
  if (!service?.get) return null;
  const identity = await service.get();
  return profileIdFromIdentity(identity);
}

/**
 * Synchronize TizenTube's active profile with YouTube's CurrentIdentityService.
 * When previousProfileId is supplied, retries continue briefly until YouTube
 * has completed an account switch. Failure is deliberately non-fatal: YouTube
 * keeps working with the legacy device-wide settings.
 */
export async function refreshActiveProfile(previousProfileId, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const profileId = await readCurrentProfileId();
      if (profileId && (!previousProfileId || profileId !== previousProfileId)) {
        setActiveProfileId(profileId);
        return profileId;
      }
    } catch (error) {
      console.warn('Unable to read the active YouTube account:', error);
    }
    if (attempt + 1 < attempts) await wait(RETRY_DELAY_MS);
  }
  return getActiveProfileId();
}

export async function initializeActiveProfile() {
  // At normal startup the identity service is already registered by the time
  // the video element exists. A few short retries cover slower devices without
  // delaying startup for more than one second.
  return refreshActiveProfile(null, 5);
}

