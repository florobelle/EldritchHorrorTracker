<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import leadToken from '#lib/assets/Lead_Investigator_token.webp';
	import AutoPassSwitch from '#lib/components/auto-pass-switch.svelte';
	import reckoningIcon from '#lib/assets/reckoning-icon.webp';
	import { ACTIONS, ENCOUNTERS, MYTHOS_EFFECTS } from '#lib/actions.js';
	import { CONDITIONS, getCondition } from '#lib/conditions.js';
	import { getInvestigator } from '#lib/investigators.js';
	import {
		addCondition,
		assignLead,
		assignNextLead,
		confirmTurnOrder,
		endTurn,
		finishMythos,
		nextMythosStep,
		previousMythosStep,
		removeCondition,
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
	const mythosStep = $derived(party.game?.mythosStep ?? 0);
	const mythosEffect = $derived(MYTHOS_EFFECTS[mythosStep]);

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
		<h2 class="text-xl font-bold">Mythos Phase</h2>
		{#if mythosEffect}
			<div class="flex flex-col gap-2 border border-[#d8cba8] bg-[#f6efdc] p-4 text-[#3a3022]">
				<p class="text-sm text-[#7a6a4f]">Effect {mythosStep + 1} of {MYTHOS_EFFECTS.length}</p>
				<h3 class="text-lg font-bold">{mythosEffect.name}</h3>
				<p class="whitespace-pre-line">{#each mythosEffect.description.split('{reckoning}') as part, i (i)}{#if i > 0}<img src={reckoningIcon} alt="Reckoning" class="inline-block h-5 align-text-bottom" />{/if}{part}{/each}</p>
			</div>
			{#if mythosEffect.id === 'resolve-reckoning'}
				{#each myConditions.filter((c) => c.reckoning) as condition (condition.id)}
					{@render reminder(`Reckoning: ${condition.name}`, condition.reckoning!)}
				{/each}
			{/if}
			{#if isLead}
				<div class="flex gap-2">
					{#if mythosStep > 0}
						<Button
							size="lg"
							variant="outline"
							class="flex-1"
							disabled={busy}
							onclick={() => run(() => previousMythosStep(code, userId))}
						>
							Back
						</Button>
					{/if}
					<Button
						size="lg"
						class="flex-1"
						disabled={busy}
						onclick={() => run(() => nextMythosStep(code, userId))}
					>
						Next
					</Button>
				</div>
			{/if}
		{:else}
			<div class="border border-[#d8cba8] bg-[#f6efdc] p-4 text-[#3a3022]">
				<p class="text-lg font-semibold">Please resolve the event on the Mythos card if any.</p>
			</div>
			{#if isLead}
				<div class="flex gap-2">
					<Button
						size="lg"
						variant="outline"
						class="flex-1"
						disabled={busy}
						onclick={() => run(() => previousMythosStep(code, userId))}
					>
						Back
					</Button>
					<Button
						size="lg"
						class="flex-1"
						disabled={busy}
						onclick={() => run(() => finishMythos(code, userId))}
					>
						Done
					</Button>
				</div>
			{/if}
		{/if}
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
		{#if phase === 'encounter' || phase === 'action'}
			<div class="flex flex-col gap-2">
				<div class="grid gap-2 {phase === 'encounter' ? 'grid-cols-2' : ''}">
					{#if phase === 'encounter'}
						<Button
							variant="outline"
							onclick={() => (conditionPanel = conditionPanel === 'gain' ? null : 'gain')}
						>
							I gained a Condition
						</Button>
					{/if}
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
				{#if conditionPanel === 'remove' || (conditionPanel === 'gain' && phase === 'encounter')}
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
		{/if}
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
		<Button size="lg" disabled={!isActive || busy} onclick={() => run(() => endTurn(code, userId))}>
			End turn
		</Button>
	{/if}
	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}
</div>
