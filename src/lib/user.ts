const USERNAME_KEY = 'eh:username';
const USER_ID_KEY = 'eh:userId';

function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// storage unavailable (private mode, blocked site data): the value just won't persist
	}
}

export const getUsername = () => read(USERNAME_KEY);

export const setUsername = (name: string) => write(USERNAME_KEY, name);

/** Stable per-browser id, so reloading or rejoining maps to the same party member. */
export function getUserId(): string {
	let id = read(USER_ID_KEY);
	if (!id) {
		id = crypto.randomUUID();
		write(USER_ID_KEY, id);
	}
	return id;
}
