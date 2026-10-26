export type Condition = {
	id: string;
	name: string;
	/** Reminder shown on the player's turn in the Action Phase */
	action?: string;
	/** Reminder shown while the Resolve Reckoning Effects card is up */
	reckoning?: string;
};

export const CONDITIONS: Condition[] = [
	{
		id: 'detained',
		name: 'Detained',
		action:
			'You are Detained. Test Influence. If you pass, discard the card and you may perform a second action. If you fail, skip your turn.'
	},
	{ id: 'dark-pact', name: 'Dark Pact', reckoning: 'You have a Reckoning event.' },
	{
		id: 'debt',
		name: 'Debt',
		action: 'You are in Debt. Test Influence. If you pass, discard the card.',
		reckoning: 'You have a Reckoning event.'
	},
	{
		id: 'cursed',
		name: 'Cursed',
		action:
			"Only 6's count as successes on your tests. If you would gain another Cursed Condition, flip this card instead. If you would gain a Blessed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 4, 5, or 6, discard this card.'
	},
	{
		id: 'blessed',
		name: 'Blessed',
		action:
			"4, 5 and 6's count as successes on your tests. If you would gain another Blessed Condition, flip this card instead. If you would gain a Cursed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 1 or 2, discard this card.'
	},
	{
		id: 'madness-injury',
		name: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	}
];

export const getCondition = (id: string) => CONDITIONS.find((c) => c.id === id);
