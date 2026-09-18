import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  h5vcc: null,
  localStorage: {
    'ytaf-configuration': JSON.stringify({
      enableShorts: true,
      disabledSidebarContents: ['ADULT_ONLY'],
      sidebarContentsOrder: ['ADULT_HOME'],
    })
  }
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

const {
  configRead,
  configWrite,
  getActiveProfileId,
  setActiveProfileId,
} = await import('../config.js');
const {
  profileIdFromIdentity,
  refreshActiveProfile,
} = await import('../features/accountProfiles.js');

test('profile-scoped settings are isolated and inherited safely', () => {
  setActiveProfileId('adult');
  const adultOrder = configRead('sidebarContentsOrder');
  adultOrder.push('ADULT_LIBRARY');
  configWrite('sidebarContentsOrder', adultOrder);
  configWrite('enableShorts', false);

  setActiveProfileId('child');
  assert.deepEqual(configRead('sidebarContentsOrder'), ['ADULT_HOME']);
  assert.equal(configRead('enableShorts'), true);

  configWrite('disabledSidebarContents', ['CHILD_SHORTS']);
  setActiveProfileId('adult');
  assert.equal(getActiveProfileId(), 'adult');
  assert.deepEqual(configRead('sidebarContentsOrder'), ['ADULT_HOME', 'ADULT_LIBRARY']);
  assert.deepEqual(configRead('disabledSidebarContents'), ['ADULT_ONLY']);
  assert.equal(configRead('enableShorts'), false);
});

test('the effective account id is used for brand and child profiles', async () => {
  const childIdentity = {
    identityType: 'PERSONA_CHILD',
    ownerObfuscatedGaiaId: 'parent-id',
    effectiveObfuscatedGaiaId: 'child-id',
  };
  assert.equal(profileIdFromIdentity(childIdentity), 'child-id');

  window._yttv = {
    registry: {
      mappings: new Map([
        ['CurrentIdentityService', { get: async () => childIdentity }],
      ])
    }
  };
  await refreshActiveProfile(null, 1);
  assert.equal(getActiveProfileId(), 'child-id');
});
