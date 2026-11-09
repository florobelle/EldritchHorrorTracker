export type Condition = {
	id: string;
	/** Condition trait, e.g. Boon or Deal */
	name: string;
	/** The specific Conditions of this trait, shown under the name */
	subtitle?: string;
	/** Reminder shown on the player's turn in the Action Phase */
	action?: string;
	/** Reminder shown while the Resolve Reckoning Effects card is up */
	reckoning?: string;
};

export const CONDITIONS: Condition[] = [
	{
		id: 'restriction',
		name: 'Restriction',
		subtitle: 'Detained, Lost in Time and Space',
		action:
			'If you are Detained: test Influence. If you pass, discard the card and you may perform a second action. If you fail, skip your turn.'
	},
	{
		id: 'madness-injury',
		name: 'Madness/Injury',
		subtitle: 'Amnesia, Back Injury, Hallucinations, Internal Injury, Leg Injury, Paranoia',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{ id: 'illness', name: 'Illness', subtitle: 'Poisoned' },
	{
		id: 'cursed',
		name: 'Bane',
		subtitle: 'Cursed',
		action:
			"Only 6's count as successes on your tests. If you would gain another Cursed Condition, flip this card instead. If you would gain a Blessed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 4, 5, or 6, discard this card.'
	},
	{
		id: 'blessed',
		name: 'Boon',
		subtitle: 'Blessed',
		action:
			"4, 5 and 6's count as successes on your tests. If you would gain another Blessed Condition, flip this card instead. If you would gain a Cursed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 1 or 2, discard this card.'
	},
	{
		id: 'deal',
		name: 'Deal',
		subtitle: 'Dark Pact, Debt',
		action: 'If you have Debt: test Influence. If you pass, discard the card.',
		reckoning: 'You have a Reckoning event.'
	}
];

export const getCondition = (id: string) => CONDITIONS.find((c) => c.id === id);
