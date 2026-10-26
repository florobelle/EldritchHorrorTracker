import { ref, get, update, onValue, runTransaction } from 'firebase/database';
import { db } from '#lib/firebase.js';

export const MAX_PLAYERS = 8;

export type Member = { name: string; joinedAt: number };

export type Party = {
	host: string;
	status: 'lobby' | 'started';
	createdAt: number;
	members: Record<string, Member>;
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
						members: { [userId]: { name, joinedAt: now } }
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
			members: { ...members, [userId]: { name, joinedAt: existing?.joinedAt ?? Date.now() } }
		};
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
