import { ref, get, update, remove, onValue, runTransaction } from 'firebase/database';
import { db } from '#lib/firebase.js';

export const MAX_PLAYERS = 8;

export type Member = {
	name: string;
	joinedAt: number;
	color?: string;
	investigator?: string;
};

/** Player colors; the first is the title green. MAX_PLAYERS swatches, so each player can get a unique one. */
export const PLAYER_COLORS = [
	'#34d399',
	'#f87171',
	'#60a5fa',
	'#fbbf24',
	'#c084fc',
	'#fb923c',
	'#22d3ee',
	'#f472b6'
];

export const DEFAULT_COLOR = PLAYER_COLORS[0];

/** Random swatch not already used by another member (any swatch if all are taken). */
function pickColor(members: Record<string, Member>): string {
	const used = new Set(Object.values(members).map((m) => m.color));
	const free = PLAYER_COLORS.filter((c) => !used.has(c));
	const pool = free.length ? free : PLAYER_COLORS;
	return pool[Math.floor(Math.random() * pool.length)];
}

/** 'order': host arranges turn order; 'lead': host picks the Lead Investigator; 'action': Action Phase. */
export type Game = {
	step: 'order' | 'lead' | 'action';
	/** Member ids in turn order */
	order: string[];
	lead?: string;
	/** Phase being played once step is 'action'; defaults to the Action Phase */
	phase?: 'action' | 'encounter' | 'mythos';
	/** Mythos Phase progress: index of the effect shown to everyone; past the last effect means the event prompt */
	mythosStep?: number;
	/** Index into `order` of the player whose turn it is */
	turn: number;
};

export type Party = {
	host: string;
	status: 'lobby' | 'started' | 'playing';
	createdAt: number;
	members: Record<string, Member>;
	game?: Game;
};

const partyRef = (code: string) => ref(db, `parties/${code}`);

const randomCode = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

/** Creates a party with a free 4-digit code, with the creator as host and first member. */
export async function createParty(userId: string, name: string): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const code = randomCode();
		const now = Date.now();
		// Returning undefined aborts, so an existing party under this code is never overwritten.
		const result = await runTransaction(partyRef(code), (current) =>
			current === null
				? ({
						host: userId,
						status: 'lobby',
						createdAt: now,
						members: {
							[userId]: { name, joinedAt: now, color: pickColor({}) }
						}
					} satisfies Party)
				: undefined
		);
		if (result.committed) return code;
	}
	throw new Error('Could not find a free party code. Please try again.');
}

/** Adds the user to the party. Rejoining as an existing member is allowed at any time. */
export async function joinParty(code: string, userId: string, name: string): Promise<void> {
	const snapshot = await get(partyRef(code));
	if (!snapshot.exists()) throw new Error('Party not found.');

	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		// null means the local cache was empty; returning it makes the SDK retry with server data
		if (party === null) return party;
		failure = null;
		const members = party.members ?? {};
		const existing = members[userId];
		if (!existing) {
			if (party.status === 'started') {
				failure = 'This campaign has already started.';
				return;
			}
			if (Object.keys(members).length >= MAX_PLAYERS) {
				failure = 'This party is full.';
				return;
			}
		}
		return {
			...party,
			members: {
				...members,
				[userId]: {
					...existing,
					name,
					joinedAt: existing?.joinedAt ?? Date.now(),
					color: existing?.color ?? pickColor(members)
				}
			}
		};
	});
	if (failure) throw new Error(failure);
}

/** Deletes the party from Firebase, ending the campaign for everyone. */
export async function endCampaign(code: string): Promise<void> {
	await remove(partyRef(code));
}

/** Locks in the investigators and begins the campaign. Called by the host once everyone has chosen. */
export async function beginCampaign(code: string): Promise<void> {
	await update(partyRef(code), { status: 'playing' });
}

/** Saves the host's turn order and moves on to picking the Lead Investigator. */
export async function confirmTurnOrder(code: string, order: string[]): Promise<void> {
	await update(partyRef(code), { game: { step: 'lead', order, turn: 0 } });
}

/** Gives the Lead Investigator token to a member, rotates the turn order to start with them and begins the Action Phase. */
export async function assignLead(code: string, leadId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const order = party.game?.order ?? [];
		const start = order.indexOf(leadId);
		if (start < 0) {
			failure = 'That player is not in the turn order.';
			return;
		}
		const rotated = [...order.slice(start), ...order.slice(0, start)];
		return {
			...party,
			game: { step: 'action', phase: 'action', order: rotated, lead: leadId, turn: 0 }
		};
	});
	if (failure) throw new Error(failure);
}

/** Passes the turn to the next player. Only the active player may do this. */
export async function endTurn(code: string, userId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const game = party.game;
		if (!game || game.step !== 'action') {
			failure = 'The Action Phase has not started.';
			return;
		}
		if (userId !== game.order[game.turn]) {
			failure = "It isn't your turn.";
			return;
		}
		const next = game.turn + 1;
		if (next < game.order.length) return { ...party, game: { ...game, turn: next } };
		// Everyone has played this phase: Action -> Encounter -> Mythos
		if (game.phase === 'encounter') {
			return { ...party, game: { ...game, phase: 'mythos', mythosStep: 0, turn: 0 } };
		}
		return { ...party, game: { ...game, phase: 'encounter', turn: 0 } };
	});
	if (failure) throw new Error(failure);
}

/** Lead Investigator moves to the next Mythos effect (or the event prompt after the last one). */
export async function nextMythosStep(code: string, userId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const game = party.game;
		if (game?.phase !== 'mythos' || userId !== game.lead) {
			failure = 'Only the Lead Investigator can advance the Mythos Phase.';
			return;
		}
		return { ...party, game: { ...game, mythosStep: (game.mythosStep ?? 0) + 1 } };
	});
	if (failure) throw new Error(failure);
}

/** Lead Investigator ends the Mythos Phase; play continues with the Action Phase starting from the lead. */
export async function finishMythos(code: string, userId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const game = party.game;
		if (game?.phase !== 'mythos' || userId !== game.lead) {
			failure = 'Only the Lead Investigator can end the Mythos Phase.';
			return;
		}
		const { mythosStep: _, ...rest } = game;
		return { ...party, game: { ...rest, phase: 'action', turn: 0 } };
	});
	if (failure) throw new Error(failure);
}

/** True once every member has picked an investigator. */
export const allSelected = (party: Party) =>
	Object.values(party.members ?? {}).every((m) => m.investigator);

/**
 * Picks an investigator for the user. Investigators are unique per party, and picks are
 * locked once every member has chosen.
 */
export async function selectInvestigator(
	code: string,
	userId: string,
	investigatorId: string
): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const members = party.members ?? {};
		const me = members[userId];
		if (!me) {
			failure = 'You are not in this party.';
			return;
		}
		if (party.status === 'playing') {
			failure = 'Investigators are locked in.';
			return;
		}
		if (
			Object.entries(members).some(([id, m]) => id !== userId && m.investigator === investigatorId)
		) {
			failure = 'That investigator was just taken.';
			return;
		}
		return {
			...party,
			members: {
				...members,
				[userId]: { ...me, investigator: investigatorId }
			}
		};
	});
	if (failure) throw new Error(failure);
}

/** Clears the user's pick so they can choose again. Not possible once the campaign has begun. */
export async function clearInvestigator(code: string, userId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const me = party.members?.[userId];
		if (!me) {
			failure = 'You are not in this party.';
			return;
		}
		if (party.status === 'playing') {
			failure = 'Investigators are locked in.';
			return;
		}
		// Firebase rejects undefined values, so drop the field instead of setting it.
		const { investigator: _, ...rest } = me;
		return { ...party, members: { ...party.members, [userId]: rest } };
	});
	if (failure) throw new Error(failure);
}

export async function startParty(code: string): Promise<void> {
	await update(partyRef(code), { status: 'started' });
}

/** Calls back with the party (or null if it doesn't exist) on every change. Returns an unsubscribe function. */
export function subscribeParty(code: string, callback: (party: Party | null) => void) {
	return onValue(partyRef(code), (snapshot) => callback(snapshot.val() as Party | null));
}
