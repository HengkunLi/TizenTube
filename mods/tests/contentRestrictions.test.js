import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyContentRestrictions,
  removeHomeRecommendations,
  removeShortsContent,
  removeSubscriptionControls,
} from '../utils/contentRestrictions.js';

function browseResponse(browseId) {
  return {
    responseContext: {
      serviceTrackingParams: [{ params: [{ key: 'browse_id', value: browseId }] }]
    },
    contents: {
      tvBrowseRenderer: {
        content: {
          tvSurfaceContentRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  { shelfRenderer: { title: 'Recommendations' } },
                  { feedNudgeRenderer: { title: 'Kept message' } },
                ],
                continuations: [{ next: 'page' }],
              }
            }
          }
        }
      }
    }
  };
}

test('home recommendations are removed only from the home browse response', () => {
  const home = browseResponse('FEtopics');
  const subscriptions = browseResponse('FEsubscriptions');
  removeHomeRecommendations(home);
  removeHomeRecommendations(subscriptions);

  const homeList = home.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content.sectionListRenderer;
  const subscriptionsList = subscriptions.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content.sectionListRenderer;
  assert.deepEqual(homeList.contents, [{ feedNudgeRenderer: { title: 'Kept message' } }]);
  assert.deepEqual(homeList.continuations, []);
  assert.equal(subscriptionsList.contents.length, 2);
});

test('subscribe controls are removed without deleting unrelated buttons', () => {
  const response = {
    owner: {
      subscribeButtonRenderer: { subscribed: false },
      title: 'Channel',
      buttons: [
        { buttonRenderer: { serviceEndpoint: { subscribeEndpoint: { channelIds: ['x'] } } } },
        { buttonRenderer: { serviceEndpoint: { shareEntityServiceEndpoint: {} } } },
      ]
    }
  };

  removeSubscriptionControls(response);
  assert.equal(response.owner.subscribeButtonRenderer, undefined);
  assert.equal(response.owner.title, 'Channel');
  assert.equal(response.owner.buttons.length, 1);
  assert.ok(response.owner.buttons[0].buttonRenderer.serviceEndpoint.shareEntityServiceEndpoint);
});

test('shorts are removed from shelves, mixed lists, continuations and the guide', () => {
  const response = {
    shelves: [
      { shelfRenderer: { tvhtml5ShelfRendererType: 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS' } },
      {
        shelfRenderer: {
          content: {
            horizontalListRenderer: {
              items: [
                { tileRenderer: { tvhtml5ShelfRendererType: 'TVHTML5_TILE_RENDERER_TYPE_SHORTS' } },
                { tileRenderer: { contentId: 'normal-video' } },
              ]
            }
          }
        }
      }
    ],
    continuation: {
      items: [
        { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_SHORT' } },
        { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_VIDEO' } },
      ]
    },
    guide: [
      { guideEntryRenderer: { navigationEndpoint: { browseEndpoint: { browseId: 'FEshorts' } } } },
      { guideEntryRenderer: { navigationEndpoint: { browseEndpoint: { browseId: 'FEsubscriptions' } } } },
    ]
  };

  removeShortsContent(response);
  assert.equal(response.shelves.length, 1);
  assert.equal(response.shelves[0].shelfRenderer.content.horizontalListRenderer.items.length, 1);
  assert.equal(response.continuation.items.length, 1);
  assert.equal(response.guide.length, 1);
});

test('combined restrictions tolerate null and unrelated responses', () => {
  assert.equal(applyContentRestrictions(null, {}), null);
  const response = { contents: { message: 'unchanged' } };
  assert.equal(applyContentRestrictions(response, {
    hideShorts: true,
    hideHomeRecommendations: true,
    hideSubscribeButtons: true,
  }), response);
  assert.equal(response.contents.message, 'unchanged');
});
