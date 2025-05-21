import { Log } from "$lib/service/LogService";
import { SettingsService } from "$lib/service/SettingsService.svelte";
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
    }
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

