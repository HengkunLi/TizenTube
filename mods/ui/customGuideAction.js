import { configChangeEmitter, configRead, configWrite } from "../config.js";
import getCommandExecutor from "./customCommandExecution.js";
import { GuideEntryRenderer } from "./ytUI.js";
import { filterGuideItems, guideItemId, mergeGuideOrder, reorderGuideItems } from "../utils/guideItems.js";

const origParse = JSON.parse;
JSON.parse = function () {
    const r = origParse.apply(this, arguments);
    const recoverySnapshots = [];
    try {
        const sections = Array.isArray(r?.items)
            ? r.items.map(item => item?.guideSectionRenderer).filter(section => Array.isArray(section?.items))
            : [];
        if (sections.length === 0) return r;
        sections.forEach(section => {
            recoverySnapshots.push({ section, items: section.items.slice() });
        });

        const primarySection = sections[0];
        const previousOrder = configRead('sidebarContentsOrder');
        const order = mergeGuideOrder(previousOrder, primarySection.items);
        if (JSON.stringify(order) !== JSON.stringify(previousOrder)) {
            configWrite('sidebarContentsOrder', order);
        }

        const itemsForOrdering = primarySection.items.slice();
        for (const orderItem of order) {
            if (typeof orderItem === 'object' && orderItem !== null
                && !itemsForOrdering.some(item => guideItemId(item) === orderItem.browseId)) {
                itemsForOrdering.push(GuideEntryRenderer(
                    orderItem.title,
                    { browseEndpoint: { browseId: orderItem.browseId } },
                    'PERSON'
                ));
            }
        }
        primarySection.items = reorderGuideItems(itemsForOrdering, order);

        const disabledSidebarContents = configRead('disabledSidebarContents');
        const disableChannelsOnSidebar = configRead('disableChannelsOnSidebar');
        const originals = sections.map(section => section.items.slice());

        sections.forEach((section, index) => {
            section.originalItems = originals[index];
            section.items = filterGuideItems(
                section.items,
                disabledSidebarContents,
                disableChannelsOnSidebar
            );
        });

        // A malformed/new child-profile response must never leave the entire
        // guide empty. Restore YouTube's entries so account/settings controls
        // remain reachable and the user cannot be trapped in that profile.
        const originalCount = originals.reduce((sum, items) => sum + items.length, 0);
        const filteredCount = sections.reduce((sum, section) => sum + section.items.length, 0);
        if (originalCount > 0 && filteredCount === 0) {
            sections.forEach((section, index) => {
                section.items = originals[index];
            });
            console.warn('TizenTube refused to apply a sidebar configuration that removed every entry.');
        }
    } catch (error) {
        // Never make JSON.parse fail because YouTube changed a guide renderer.
        recoverySnapshots.forEach(snapshot => {
            snapshot.section.items = snapshot.items;
        });
        console.error('Unable to customize the YouTube guide:', error);
    }

    return r;
}

configChangeEmitter.addEventListener('configChange', (e) => {
    if (e.detail.key === 'disabledSidebarContents' || e.detail.key === 'disableChannelsOnSidebar' || e.detail.key === 'sidebarContentsOrder' || e.detail.key === 'activeProfileId') {
        const commandExecutor = getCommandExecutor();
        if (commandExecutor) {
            commandExecutor.executeFunction(new commandExecutor.commandFunction('reloadGuideAction'));
        }
    }
});
