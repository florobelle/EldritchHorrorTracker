export type GameAction = { id: string; name: string; description: string };

/** Actions available in the Action Phase; each player performs 2 distinct actions per turn. */
export const ACTIONS: GameAction[] = [
	{
		id: 'travel',
		name: 'Travel',
		description:
			'The investigator moves 1 space, then may spend travel tickets to move additional spaces.'
	},
	{
		id: 'prepare-for-travel',
		name: 'Prepare for Travel',
		description:
			'The investigator on a City space gains 1 Ship Ticket or 1 Train Ticket. An investigator cannot have more than two travel tickets.'
	},
	{
		id: 'rest',
		name: 'Rest',
		description:
			"The investigator recovers 1 Health and 1 Sanity. Spend Resources to recover additional Health and Sanity. This action cannot be performed if there is a Monster on the investigator's space."
	},
	{
		id: 'acquire-assets',
		name: 'Acquire Assets',
		description:
			"The investigator on a City space tests Influence to gain Assets from reserve with total value up to his test result. He may spend Resources for additional successes. This action cannot be performed if there is a Monster on the investigator's space."
	},
	{
		id: 'trade',
		name: 'Trade',
		description:
			'The investigator may exchange any number of possessions with another investigator on his space.'
	},
	{
		id: 'component-actions',
		name: 'Component Actions',
		description:
			'The investigator may perform an action listed on one of their components (such as a card or his Investigator sheet). These actions are preceded by the word "Action" or "Local Action" in bold.'
	}
];
