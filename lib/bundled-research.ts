// Weekly research uploads append a validated batch here, then save an unpublished Site version.
// Loading a bundle never publishes catalog records.
import smartphoneLaunch from "@/data/research/smartphones-2026-09-09.json";
import portableSpeakers from "@/data/research/portable-speakers-2026-09-10.json";
import vrHeadsets from "@/data/research/vr-headsets-2026-09-10.json";
import wearables from "@/data/research/wearables-2026-09-10.json";
import gameConsoles from "@/data/research/game-consoles-2026-09-10.json";
import { validateResearchBatch } from "@/lib/research-contract";
export function getBundledResearch() { return [smartphoneLaunch,portableSpeakers,vrHeadsets,wearables,gameConsoles].map(validateResearchBatch); }
