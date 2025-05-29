import { Log } from "$lib/service/LogService";
import { SettingsService } from "$lib/service/SettingsService.svelte";
import { cacheBase64Image } from "$lib/utils/imageHelpers";
import { db, getSettings } from "./db.svelte";

interface Ratchet {
    name: string;
    version: number;
    run: () => Promise<void>;
}

const ratchets: Ratchet[] = [
    {
        name: 'Update isSubscribed=1 for all feeds',
        version: 1,
        run: async () => {
            db.feeds.updateMany({}, { $set: { isSubscribed: 1 } });
        }
    },
    {
        name: 'Cache all feed icons',
        version: 2,
        run: async () => {
            const feeds = db.feeds.find({}).fetch();
            for (const feed of feeds) {
                await cacheBase64Image(feed.iconData, feed.id);
            }
        }
    },
];

export async function runRatchets() {
    const settings = getSettings();

    const pendingRatchets = ratchets.filter(r => r.version > (settings.ratchet ?? 0));

    if (pendingRatchets.length === 0) {
        return;
    }


    for (const r of pendingRatchets) {
        try {
            Log.info(`Ratchet ${r.version} started - ${r.name}`);
            await r.run();
            SettingsService.updateRatchet(r.version);
            Log.info(`Ratchet ${r.version} completed`);
        } catch (e) {
            Log.error(`Ratchet ${r.version} failed: ${e instanceof Error ? `${e.message} - ${e.stack}` : String(e)}`);
            return;
        }
    }
}

