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

export const ENCOUNTERS: GameAction[] = [
	{
		id: 'combat',
		name: 'Combat Encounters',
		description:
			'A Combat Encounter is a type of encounter that occurs when the Investigator begins the Encounter Phase while on the same space as a monster. The investigator must encounter every monster that shares his space, one at a time.'
	},
	{
		id: 'location',
		name: 'Location Encounters',
		description:
			'An investigator may always choose to complete a General Encounter or a specific Location Encounter if they are on a major area; major areas have a distinct color group and large portrait on the game boards. The investigator only resolves the encounter for the area that they are in.'
	},
	{
		id: 'research',
		name: 'Research Encounters',
		description:
			'An investigator may choose to draw a Research Encounter if he is on a space with a Clue token during the Encounter Phase. Similar to a General Encounter, the player is given three options of City/City, Sea/Wilderness, or Sea/Sea space, and picks the one that is appropriate to the space.'
	},
	{
		id: 'other-world',
		name: 'Other World Encounters',
		description:
			'An investigator on a space containing a Gate may choose to complete an Other World Encounter; Other World Encounters are the primary way in which investigators close Gates. Other World Encounters are complex encounters; the pass effect usually allows players to close the Gate that they are on.'
	},
	{
		id: 'expedition',
		name: 'Expedition Encounters',
		description:
			'An investigator on a space containing the Active Expedition token may choose to complete an Expedition Encounter. Each Expedition space is indicated by a postcard image of its area. The Active Expedition token is always located on the space indicated on the back of the top card of the Expedition Encounter deck; Expedition Encounters are complex encounters.'
	},
	{
		id: 'rumor',
		name: 'Rumor Encounters',
		description:
			'Rumor tokens allow investigators to resolve the encounter listed on the Rumor Mythos card that refers to that space.'
	},
	{
		id: 'defeated-investigator',
		name: 'Defeated Investigator Encounter',
		description:
			"Defeated Investigator tokens allow investigators to resolve the encounter listed on the back of the defeated investigator's sheet."
	}
];
