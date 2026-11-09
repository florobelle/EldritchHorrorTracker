<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import leadToken from '#lib/assets/Lead_Investigator_token.webp';
	import AutoPassSwitch from '#lib/components/auto-pass-switch.svelte';
	import reckoningIcon from '#lib/assets/reckoning-icon.webp';
	import { ACTIONS, ENCOUNTERS, MYTHOS_EFFECTS } from '#lib/actions.js';
	import { CONDITIONS, getCondition } from '#lib/conditions.js';
	import { INVESTIGATORS, getInvestigator } from '#lib/investigators.js';
	import {
		addCondition,
		assignLead,
		assignNextLead,
		confirmTurnOrder,
		endTurn,
		finishMythos,
		removeCondition,
		replaceInvestigator,
		unavailableInvestigators,
		DEFAULT_COLOR,
		type Party
	} from '#lib/party.js';

	let { party, code, userId }: { party: Party; code: string; userId: string } = $props();

	const isHost = $derived(party.host === userId);
	const step = $derived(party.game?.step ?? 'order');
	/** Saved turn order, falling back to join order; members that joined since are appended. */
	const savedOrder = $derived.by(() => {
		const byJoin = Object.entries(party.members ?? {})
			.sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
			.map(([id]) => id);
		const saved = (party.game?.order ?? []).filter((id) => party.members?.[id]);
		return [...saved, ...byJoin.filter((id) => !saved.includes(id))];
	});

	let draftOrder = $state<string[] | null>(null);
	let pickedLead = $state<string | null>(null);
	let autoPass = $state(false);
	let openAction = $state<string | null>(null);
	const phase = $derived(party.game?.phase ?? 'action');
	const phaseInfo = $derived(
		phase === 'encounter'
			? { title: 'Encounter Phase', note: 'Choose 1 encounter on your turn.', items: ENCOUNTERS }
			: { title: 'Action Phase', note: 'Perform 2 different actions on your turn.', items: ACTIONS }
	);
	let conditionPanel = $state<'gain' | 'remove' | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const order = $derived(draftOrder ?? savedOrder);
	const activeId = $derived(party.game?.order[party.game.turn]);
	const isActive = $derived(activeId === userId);
	const myConditions = $derived(
		(party.members?.[userId]?.conditions ?? []).flatMap((id) => getCondition(id) ?? [])
	);
	const isDetained = $derived(myConditions.some((c) => c.id === 'detained'));
	const isLead = $derived(party.game?.lead === userId);
	/** Mythos effects followed by the card's event. */
	const mythosItems = [
		...MYTHOS_EFFECTS,
		{
			id: 'event',
			name: 'Mythos Event',
			description: 'Please resolve the event on the Mythos card if any.'
		}
	];
	let mythosOpen = $state<string | null>(null);
	let replacing = $state(false);
	let replacement = $state<string | null>(null);
	const availableInvestigators = $derived.by(() => {
		const taken = unavailableInvestigators(party);
		return INVESTIGATORS.filter((inv) => !taken.has(inv.id));
	});

	function move(index: number, delta: number) {
		const next = [...order];
		const target = index + delta;
		if (target < 0 || target >= next.length) return;
		[next[index], next[target]] = [next[target], next[index]];
		draftOrder = next;
	}

	async function run(action: () => Promise<void>) {
		busy = true;
		error = null;
		try {
			await action();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
</script>

{#snippet reminder(title: string, text: string)}
	<div class="border border-[#d8cba8] bg-[#f6efdc] p-3 text-left text-[#3a3022]">
		<p class="font-bold">{title}</p>
		<p class="text-sm">{text}</p>
	</div>
{/snippet}

{#snippet conditionControls()}
	<div class="flex flex-col gap-2">
		<div class="grid grid-cols-2 gap-2">
			<Button
				variant="outline"
				onclick={() => (conditionPanel = conditionPanel === 'gain' ? null : 'gain')}
			>
				I gained a Condition
			</Button>
			<Button
				variant="outline"
				disabled={myConditions.length === 0}
				onclick={() => (conditionPanel = conditionPanel === 'remove' ? null : 'remove')}
			>
				Remove condition
			</Button>
		</div>
		{#if myConditions.length}
			<div class="flex flex-wrap gap-1">
				{#each myConditions as condition (condition.id)}
					<Badge variant="secondary">{condition.name}</Badge>
				{/each}
			</div>
		{/if}
		{#if conditionPanel === 'remove' || conditionPanel === 'gain'}
			<div class="bg-muted flex flex-col gap-1 p-2">
				<p class="text-muted-foreground px-1 text-sm">
					{conditionPanel === 'gain' ? 'Which Condition did you gain?' : 'Which Condition to remove?'}
				</p>
				{#each conditionPanel === 'gain' ? CONDITIONS : myConditions as condition (condition.id)}
					<Button
						variant="ghost"
						class="justify-start"
						disabled={busy ||
							(conditionPanel === 'gain' && myConditions.some((c) => c.id === condition.id))}
						onclick={() =>
							run(async () => {
								if (conditionPanel === 'gain') await addCondition(code, userId, condition.id);
								else await removeCondition(code, userId, condition.id);
								conditionPanel = null;
							})}
					>
						{condition.name}
					</Button>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet replaceControls()}
	<div class="flex flex-col gap-2">
		<Button
			variant="outline"
			onclick={() => {
				replacing = !replacing;
				replacement = null;
			}}
		>
			My investigator died
		</Button>
		{#if replacing}
			<div class="bg-muted flex flex-col gap-2 p-2">
				<p class="text-muted-foreground px-1 text-sm">
					Choose a new investigator. Fallen and chosen investigators are unavailable.
				</p>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
					{#each availableInvestigators as inv (inv.id)}
						<button
							type="button"
							onclick={() => (replacement = inv.id)}
							class="relative overflow-hidden border-4 text-left {replacement === inv.id
								? 'border-foreground'
								: 'border-transparent'}"
						>
							<img src={inv.image} alt={inv.name} class="aspect-square w-full object-cover object-top" />
							<span class="bg-background/80 absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-xs">
								{inv.name}
							</span>
						</button>
					{:else}
						<p class="text-muted-foreground col-span-full text-sm">No investigators left.</p>
					{/each}
				</div>
				<Button
					disabled={!replacement || busy}
					onclick={() =>
						replacement &&
						run(async () => {
							await replaceInvestigator(code, userId, replacement!);
							replacing = false;
							replacement = null;
						})}
				>
					{replacement ? `Replace with ${getInvestigator(replacement)?.name}` : 'Select an investigator'}
				</Button>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet player(id: string)}
	{@const member = party.members[id]}
	{@const inv = getInvestigator(member.investigator)}
	<div
		class="bg-muted flex flex-1 items-center gap-3 border-l-4 px-3 py-2 text-left"
		style:border-color={member.color ?? DEFAULT_COLOR}
	>
		{#if inv}
			<img src={inv.image} alt={inv.name} class="size-12 object-cover object-top" />
		{/if}
		<div class="flex-1">
			<p>{member.name}{id === userId ? ' (you)' : ''}</p>
			<p class="text-muted-foreground text-sm">{inv?.name}</p>
		</div>
		{#if id === party.game?.lead}
			<img src={leadToken} alt="Lead Investigator" class="h-11 w-auto shrink-0" />
		{/if}
		{#if id === party.host}
			<Badge>Host</Badge>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-4">
	{#if step === 'order'}
		<div>
			<h2 class="text-xl font-bold">Turn order</h2>
			<p class="text-muted-foreground text-sm">
				{isHost ? 'Arrange the order players take their turns.' : 'Waiting for the host to set the turn order.'}
			</p>
		</div>
		<ol class="flex flex-col gap-2">
			{#each order as id, i (id)}
				<li class="flex items-center gap-2">
					<span class="w-5 text-right font-semibold">{i + 1}</span>
					{@render player(id)}
					{#if isHost}
						<div class="flex flex-col">
							<Button size="icon-xs" variant="ghost" aria-label="Move up" disabled={i === 0} onclick={() => move(i, -1)}>▲</Button>
							<Button size="icon-xs" variant="ghost" aria-label="Move down" disabled={i === order.length - 1} onclick={() => move(i, 1)}>▼</Button>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
		{#if isHost}
			<Button size="lg" disabled={busy} onclick={() => run(() => confirmTurnOrder(code, order))}>
				Confirm turn order
			</Button>
		{/if}
	{:else if step === 'lead'}
		<div>
			<h2 class="text-xl font-bold">Lead Investigator</h2>
			<p class="text-muted-foreground text-sm">
				{isHost ? 'Choose who takes the Lead Investigator token. They will go first.' : 'Waiting for the host to assign the Lead Investigator.'}
			</p>
		</div>
		<ul class="flex flex-col gap-2">
			{#each savedOrder as id (id)}
				<li class="flex">
					{#if isHost}
						<button
							type="button"
							class="flex flex-1 border-2 {pickedLead === id ? 'border-foreground' : 'border-transparent'}"
							onclick={() => (pickedLead = id)}
						>
							{@render player(id)}
						</button>
					{:else}
						{@render player(id)}
					{/if}
				</li>
			{/each}
		</ul>
		{#if isHost}
			<AutoPassSwitch checked={autoPass} onchange={(value) => (autoPass = value)} />
		{/if}
		{#if isHost}
			<Button
				size="lg"
				disabled={!pickedLead || busy}
				onclick={() =>
					pickedLead &&
					run(async () => {
						await assignLead(code, pickedLead!, autoPass);
						pickedLead = null;
					})}
			>
				Assign Lead Investigator
			</Button>
		{/if}
	{:else if phase === 'handoff'}
		<p class="text-lg font-semibold">
			{isLead
				? 'Please choose the next Lead Investigator.'
				: 'Please wait for the Lead Investigator to choose the next lead.'}
		</p>
		<div>
			<h2 class="text-xl font-bold">Lead Investigator</h2>
			<p class="text-muted-foreground text-sm">
				The new lead goes first in the Action Phase. The current lead cannot be chosen again.
			</p>
		</div>
		<ul class="flex flex-col gap-2">
			{#each party.game?.order ?? [] as id (id)}
				<li class="flex">
					{#if isLead && id !== party.game?.lead}
						<button
							type="button"
							class="flex flex-1 border-2 {pickedLead === id
								? 'border-foreground'
								: 'border-transparent'}"
							onclick={() => (pickedLead = id)}
						>
							{@render player(id)}
						</button>
					{:else}
						{@render player(id)}
					{/if}
				</li>
			{/each}
		</ul>
		{#if isLead}
			<Button
				size="lg"
				disabled={!pickedLead || busy}
				onclick={() =>
					pickedLead &&
					run(async () => {
						await assignNextLead(code, userId, pickedLead!);
						pickedLead = null;
					})}
			>
				Assign Lead Investigator
			</Button>
		{/if}
	{:else if phase === 'mythos'}
		<p class="text-lg font-semibold">
			{isLead
				? 'Please draw a Mythos card and resolve each effect and event.'
				: 'Please wait for the Lead Investigator to resolve the Mythos Phase.'}
		</p>
		<div>
			<h2 class="text-xl font-bold">Mythos Phase</h2>
			<p class="text-muted-foreground text-sm">Resolve each effect in order, then the event.</p>
		</div>
		{#if isLead || isHost}
			<Button
				size="lg"
				variant={isHost ? 'outline' : 'default'}
				disabled={busy}
				onclick={() => run(() => finishMythos(code, userId))}
			>
				{isHost ? 'Skip Mythos Phase' : 'End Turn'}
			</Button>
		{/if}
		{@render replaceControls()}
		<ul class="flex flex-col gap-1">
			{#each mythosItems as item (item.id)}
				{@const open = mythosOpen === item.id}
				<li class="bg-muted">
					<button
						type="button"
						class="flex w-full items-center justify-between gap-2 px-3 py-3 text-left font-semibold"
						aria-expanded={open}
						onclick={() => (mythosOpen = open ? null : item.id)}
					>
						<span>{item.name}</span>
						<span class="flex items-center gap-2">
							<span class="text-muted-foreground">{open ? '−' : '+'}</span>
						</span>
					</button>
					{#if open}
						<div class="flex flex-col gap-2 px-3 pb-3">
							<p class="text-muted-foreground min-h-12 text-sm whitespace-pre-line">{#each item.description.split('{reckoning}') as part, j (j)}{#if j > 0}<img src={reckoningIcon} alt="Reckoning" class="inline-block h-5 align-text-bottom" />{/if}{part}{/each}</p>
							{#if item.id === 'resolve-reckoning'}
								{#each myConditions.filter((c) => c.reckoning) as condition (condition.id)}
									{@render reminder(`Reckoning: ${condition.name}`, condition.reckoning!)}
								{/each}
								{@render conditionControls()}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-lg font-semibold">
			{isActive ? 'It is your turn.' : 'Please wait for your turn.'}
		</p>
		<div>
			<h2 class="text-xl font-bold">{phaseInfo.title}</h2>
			<p class="text-muted-foreground text-sm">{phaseInfo.note}</p>
		</div>
		{#if phase === 'action' && isActive}
			{#each myConditions.filter((c) => c.action) as condition (condition.id)}
				{@render reminder(condition.name, condition.action!)}
			{/each}
		{/if}
		{#if isActive}
			<Button size="lg" disabled={busy} onclick={() => run(() => endTurn(code, userId))}>
				End turn
			</Button>
		{:else if isHost || isLead}
			<Button
				size="lg"
				variant="outline"
				disabled={busy}
				onclick={() => run(() => endTurn(code, userId))}
			>
				Skip {party.members[activeId ?? '']?.name ?? 'player'}'s turn
			</Button>
		{:else}
			<Button size="lg" disabled>End turn</Button>
		{/if}
		{#if phase === 'encounter' || phase === 'action'}
			{@render conditionControls()}
		{/if}
		<ul class="flex flex-col gap-1 {phase === 'action' && isActive && isDetained ? 'hidden' : ''}">
			{#each phaseInfo.items as action (phase + action.id)}
				{@const key = `${phase}:${action.id}`}
				{@const open = openAction === key}
				<li class="bg-muted">
					<button
						type="button"
						class="flex w-full items-center justify-between px-3 py-3 text-left font-semibold"
						aria-expanded={open}
						onclick={() => (openAction = open ? null : key)}
					>
						{action.name}
						<span class="text-muted-foreground">{open ? '−' : '+'}</span>
					</button>
					{#if open}
						<p class="text-muted-foreground min-h-12 px-3 pb-3 text-sm">{action.description}</p>
					{/if}
				</li>
			{/each}
		</ul>
		<div>
			<p class="text-muted-foreground mb-2 text-sm">Turn order</p>
			<ol class="flex flex-col gap-2">
				{#each party.game?.order ?? [] as id (id)}
					<li class="flex items-center gap-2 {id === activeId ? '' : 'opacity-60'}">
						{@render player(id)}
						{#if id === activeId}
							<Badge variant="secondary">Turn</Badge>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	{/if}
	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}
</div>
