export type Investigator = {
	id: string;
	name: string;
	title: string;
	health: number;
	sanity: number;
	lore: number;
	influence: number;
	observation: number;
	strength: number;
	will: number;
	location: string;
	possessions: string[];
	roles: string[];
	image: string;
};

const images = import.meta.glob<string>('/src/lib/assets/characters/*.webp', {
	eager: true,
	query: '?url',
	import: 'default'
});

const imageFor = (id: string) => images[`/src/lib/assets/characters/${id}.webp`];

type Data = Omit<Investigator, 'id' | 'image'>;

const data: Data[] = [
	{ name: 'Akachi Onyele', title: 'Shaman', health: 5, sanity: 7, lore: 3, influence: 2, observation: 2, strength: 2, will: 4, location: 'Space 15', possessions: ['2 Clues', 'Mists of Releh'], roles: ['Gate Closer'] },
	{ name: 'Charlie Kane', title: 'Politician', health: 4, sanity: 8, lore: 2, influence: 4, observation: 3, strength: 2, will: 2, location: 'San Francisco', possessions: ['Personal Assistant'], roles: ['Support'] },
	{ name: 'Diana Stanley', title: 'Redeemed Cultist', health: 7, sanity: 5, lore: 4, influence: 2, observation: 3, strength: 3, will: 1, location: 'Space 7', possessions: ['Arcane Manuscripts', 'Wither'], roles: ['Magic'] },
	{ name: 'Jacqueline Fine', title: 'Psychic', health: 4, sanity: 8, lore: 4, influence: 2, observation: 3, strength: 1, will: 3, location: 'Space 5', possessions: ['2 Clues', 'Flesh Ward'], roles: ['Magic', 'Support'] },
	{ name: 'Jim Culver', title: 'Musician', health: 7, sanity: 5, lore: 3, influence: 3, observation: 2, strength: 2, will: 3, location: 'Space 6', possessions: ['2 Clues', 'Shriveling'], roles: ['Magic', 'Support'] },
	{ name: 'Leo Anderson', title: 'Expedition Leader', health: 6, sanity: 6, lore: 2, influence: 2, observation: 3, strength: 3, will: 3, location: 'Buenos Aires', possessions: ['Hired Muscle'], roles: ['Expedition', 'All-Rounder'] },
	{ name: 'Lily Chen', title: 'Martial Artist', health: 6, sanity: 6, lore: 2, influence: 2, observation: 2, strength: 4, will: 3, location: 'Shanghai', possessions: ["Lucky Rabbit's Foot", 'Protective Amulet'], roles: ['Combat', 'All-Rounder'] },
	{ name: 'Lola Hayes', title: 'Actress', health: 5, sanity: 7, lore: 2, influence: 4, observation: 2, strength: 2, will: 3, location: 'Tokyo', possessions: ['Improvement of choice', '.18 Derringer'], roles: ['All-Rounder', 'Support'] },
	{ name: 'Mark Harrigan', title: 'Soldier', health: 8, sanity: 4, lore: 1, influence: 2, observation: 2, strength: 4, will: 4, location: 'Space 14', possessions: ['.38 Revolver', 'Kerosene'], roles: ['Combat'] },
	{ name: 'Norman Withers', title: 'Astronomer', health: 5, sanity: 7, lore: 3, influence: 1, observation: 3, strength: 2, will: 4, location: 'Arkham', possessions: ['Feed the Mind'], roles: ['Magic', 'Gate Closer'] },
	{ name: 'Silas Marsh', title: 'Sailor', health: 8, sanity: 4, lore: 1, influence: 3, observation: 3, strength: 3, will: 3, location: 'Sydney', possessions: ['Fishing Net'], roles: ['All-Rounder'] },
	{ name: 'Trish Scarborough', title: 'Spy', health: 7, sanity: 5, lore: 1, influence: 3, observation: 4, strength: 3, will: 2, location: 'Space 16', possessions: ['.45 Automatic'], roles: ['Research'] }
];

export const INVESTIGATORS: Investigator[] = data.map((d) => {
	const id = d.name.replace(/ /g, '_');
	return { ...d, id, image: imageFor(id) };
});

export const getInvestigator = (id: string | undefined) => INVESTIGATORS.find((i) => i.id === id);

export const STAT_LABELS = [
	['health', 'Health'],
	['sanity', 'Sanity'],
	['lore', 'Lore'],
	['influence', 'Influence'],
	['observation', 'Observation'],
	['strength', 'Strength'],
	['will', 'Will']
] as const;
