import { ref, get, update, remove, onValue, runTransaction } from 'firebase/database';
import { db } from '#lib/firebase.js';

export const MAX_PLAYERS = 8;

export type Member = {
	name: string;
	joinedAt: number;
	color?: string;
	investigator?: string;
	/** Ids from conditions.ts */
	conditions?: string[];
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
	/** When on, the token passes to the next player in turn order after each Mythos Phase */
	autoPass?: boolean;
	/** Phase being played once step is 'action'; defaults to the Action Phase */
	phase?: 'action' | 'encounter' | 'mythos' | 'handoff';
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

/** Saves the host's turn order and moves on to picking the Lead Investigator (a lone player is made lead straight away). */
export async function confirmTurnOrder(code: string, order: string[]): Promise<void> {
	if (order.length === 1) {
		await update(partyRef(code), {
			game: { step: 'action', phase: 'action', order, lead: order[0], autoPass: false, turn: 0 }
		});
		return;
	}
	await update(partyRef(code), { game: { step: 'lead', order, turn: 0 } });
}

/** Gives the Lead Investigator token to a member, rotates the turn order to start with them and begins the Action Phase. */
export async function assignLead(code: string, leadId: string, autoPass: boolean): Promise<void> {
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
			game: { step: 'action', phase: 'action', order: rotated, lead: leadId, autoPass, turn: 0 }
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

/** Lead Investigator returns to the previous Mythos effect. */
export async function previousMythosStep(code: string, userId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const game = party.game;
		if (game?.phase !== 'mythos' || userId !== game.lead) {
			failure = 'Only the Lead Investigator can go back in the Mythos Phase.';
			return;
		}
		return { ...party, game: { ...game, mythosStep: Math.max(0, (game.mythosStep ?? 0) - 1) } };
	});
	if (failure) throw new Error(failure);
}

/** Lead Investigator ends the Mythos Phase; the lead then chooses who holds the token next ('handoff'), unless auto pass hands it to the next player (or the only player keeps it). */
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
		if (game.autoPass || game.order.length === 1) {
			// The order starts with the current lead, so rotating by one makes the next player lead
			const order = [...game.order.slice(1), ...game.order.slice(0, 1)];
			return { ...party, game: { ...rest, order, lead: order[0], phase: 'action', turn: 0 } };
		}
		return { ...party, game: { ...rest, phase: 'handoff', turn: 0 } };
	});
	if (failure) throw new Error(failure);
}

/** Lead Investigator passes the token on; the turn order is rotated so the new lead goes first in the Action Phase. */
export async function assignNextLead(code: string, userId: string, leadId: string): Promise<void> {
	let failure = null as string | null;
	await runTransaction(partyRef(code), (party: Party | null) => {
		if (party === null) return party;
		failure = null;
		const game = party.game;
		if (game?.phase !== 'handoff' || userId !== game.lead) {
			failure = 'Only the Lead Investigator can choose the next lead.';
			return;
		}
		if (leadId === game.lead) {
			failure = 'Choose a different player as the next Lead Investigator.';
			return;
		}
		const start = game.order.indexOf(leadId);
		if (start < 0) {
			failure = 'That player is not in the turn order.';
			return;
		}
		const order = [...game.order.slice(start), ...game.order.slice(0, start)];
		return { ...party, game: { ...game, order, lead: leadId, phase: 'action', turn: 0 } };
	});
	if (failure) throw new Error(failure);
}

/** Host toggles whether the Lead Investigator token passes automatically after each Mythos Phase. */
export async function setAutoPass(code: string, autoPass: boolean): Promise<void> {
	await update(partyRef(code), { 'game/autoPass': autoPass });
}

/** Adds a condition to the member's list (no duplicates). */
export async function addCondition(code: string, userId: string, id: string): Promise<void> {
	await runTransaction(ref(db, `parties/${code}/members/${userId}/conditions`), (current) => {
		const list: string[] = current ?? [];
		return list.includes(id) ? list : [...list, id];
	});
}

/** Removes a condition from the member's list. */
export async function removeCondition(code: string, userId: string, id: string): Promise<void> {
	await runTransaction(ref(db, `parties/${code}/members/${userId}/conditions`), (current) => {
		const list: string[] = current ?? [];
		return list.includes(id) ? list.filter((c) => c !== id) : list;
	});
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
