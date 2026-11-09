export type Condition = {
	id: string;
	name: string;
	/** Condition type; the main label when choosing a Condition */
	trait: string;
	/** Reminder shown on the player's turn in the Action Phase */
	action?: string;
	/** Reminder shown while the Resolve Reckoning Effects card is up */
	reckoning?: string;
};

export const CONDITIONS: Condition[] = [
	{
		id: 'restriction',
		name: 'Restriction',
		trait: 'Restriction',
		action:
			'You have a Restriction. Test Influence. If you pass, discard the card and you may perform a second action. If you fail, skip your turn.'
	},
	{
		id: 'amnesia',
		name: 'Amnesia',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{
		id: 'back-injury',
		name: 'Back Injury',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{
		id: 'hallucinations',
		name: 'Hallucinations',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{
		id: 'internal-injury',
		name: 'Internal Injury',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{
		id: 'leg-injury',
		name: 'Leg Injury',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{
		id: 'paranoia',
		name: 'Paranoia',
		trait: 'Madness/Injury',
		action: 'When you perform a Rest action, you may roll 1 die. On a 5 or 6, discard the card.',
		reckoning: 'Test Strength. If you fail, flip the card.'
	},
	{ id: 'poisoned', name: 'Poisoned', trait: 'Illness' },
	{
		id: 'cursed',
		name: 'Cursed',
		trait: 'Bane',
		action:
			"Only 6's count as successes on your tests. If you would gain another Cursed Condition, flip this card instead. If you would gain a Blessed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 4, 5, or 6, discard this card.'
	},
	{
		id: 'blessed',
		name: 'Blessed',
		trait: 'Boon',
		action:
			"4, 5 and 6's count as successes on your tests. If you would gain another Blessed Condition, flip this card instead. If you would gain a Cursed Condition, discard this card instead.",
		reckoning: 'Roll 1 die. On a 1 or 2, discard this card.'
	},
	{
		id: 'dark-pact',
		name: 'Dark Pact',
		trait: 'Deal',
		reckoning: 'You have a Reckoning event.'
	},
	{
		id: 'debt',
		name: 'Debt',
		trait: 'Deal',
		action: 'You are in Debt. Test Influence. If you pass, discard the card.',
		reckoning: 'You have a Reckoning event.'
	}
];

export const getCondition = (id: string) => CONDITIONS.find((c) => c.id === id);

/** Conditions grouped by trait, in list order. */
export const TRAITS: { name: string; conditions: Condition[] }[] = CONDITIONS.reduce(
	(groups, condition) => {
		const group = groups.find((g) => g.name === condition.trait);
		if (group) group.conditions.push(condition);
		else groups.push({ name: condition.trait, conditions: [condition] });
		return groups;
	},
	[] as { name: string; conditions: Condition[] }[]
);
