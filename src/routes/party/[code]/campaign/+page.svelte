<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import {
		DEFAULT_COLOR,
		allSelected,
		beginCampaign,
		clearInvestigator,
		endCampaign,
		selectInvestigator,
		subscribeParty,
		type Party
	} from '#lib/party.js';
	import stamp from '#lib/assets/certified-stamp.png';
	import { INVESTIGATORS, STAT_LABELS, getInvestigator } from '#lib/investigators.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let userId = $state('');
	let viewingId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let beginning = $state(false);
	let ending = $state(false);
	let panel = $state<HTMLElement>();

	const members = $derived(
		Object.entries(party?.members ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
	);
	const everyoneSelected = $derived(party ? allSelected(party) : false);
	const isHost = $derived(party?.host === userId);
	const playing = $derived(party?.status === 'playing');
	const myPick = $derived(party?.members?.[userId]?.investigator);
	const viewing = $derived(getInvestigator(viewingId ?? myPick));
	/** investigator id -> name of the member who picked it */
	const takenBy = $derived(
		Object.fromEntries(
			members.filter(([, m]) => m.investigator).map(([id, m]) => [m.investigator, { id, name: m.name, color: m.color ?? DEFAULT_COLOR }])
		)
	);
	const viewingTaker = $derived(viewing ? takenBy[viewing.id] : undefined);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		userId = getUserId();
		const unsubscribe = subscribeParty(code, (value) => {
			// The campaign was ended (deleted) by the host
			if (!value && party) goto('/', { replaceState: true });
			party = value;
		});
		return () => {
			unsubscribe();
		};
	});

	async function end() {
		if (!confirm('End this campaign for everyone? This cannot be undone.')) return;
		ending = true;
		error = null;
		try {
			await endCampaign(code);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not end the campaign.';
			ending = false;
		}
	}

	async function begin() {
		beginning = true;
		error = null;
		try {
			await beginCampaign(code);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not start the campaign.';
			beginning = false;
		}
	}

	async function cancel() {
		error = null;
		try {
			await clearInvestigator(code, userId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not cancel your selection.';
		}
	}

	async function choose(id: string) {
		error = null;
		const taker = takenBy[id];
		if (id === myPick || (taker && taker.id !== userId)) return;
		try {
			await selectInvestigator(code, userId, id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not select investigator.';
		}
	}

	/** Previews the investigator's stats; the Select button locks the choice in. */
	function tap(id: string) {
		viewingId = id;
		error = null;
		panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	{#if !party}
		<p class="text-muted-foreground">Loading…</p>
	{:else if playing}
		<Card.Root class="w-full max-w-md py-10 text-center">
			<Card.Header>
				<Card.Title class="text-2xl">Campaign started</Card.Title>
				<Card.Description>Party {code}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				{#each members as [id, member] (id)}
					{@const inv = getInvestigator(member.investigator)}
					<div
						class="bg-muted flex items-center gap-3 border-l-4 px-3 py-2 text-left"
						style:border-color={member.color ?? DEFAULT_COLOR}
					>
						{#if inv}
							<img src={inv.image} alt={inv.name} class="size-12 object-cover object-top" />
						{/if}
						<div class="flex-1">
							<p>{member.name}{id === userId ? ' (you)' : ''}</p>
							<p class="text-muted-foreground text-sm">{inv?.name}</p>
						</div>
						{#if id === party.host}
							<Badge>Host</Badge>
						{/if}
					</div>
				{/each}
			</Card.Content>
			{#if isHost}
				<Card.Footer class="flex-col gap-2">
					<Button variant="destructive" onclick={end} disabled={ending}>
						{ending ? 'Ending…' : 'End Campaign'}
					</Button>
					{#if error}
						<p class="text-destructive text-sm">{error}</p>
					{/if}
				</Card.Footer>
			{/if}
		</Card.Root>
	{:else}
		<Card.Root class="w-full max-w-5xl py-8">
			<Card.Header class="text-center">
				<Card.Title class="text-2xl">Select your investigator</Card.Title>
				<Card.Description>
					{members.filter(([, m]) => m.investigator).length}/{members.length} players locked in. Select an investigator to lock in your choice; cancel it to choose another.
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-6 md:grid-cols-[1fr_20rem]">
				<div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
					{#each INVESTIGATORS as inv (inv.id)}
						{@const taker = takenBy[inv.id]}
						{@const takenByOther = !!taker && taker.id !== userId}
						<button
							type="button"
							onclick={() => tap(inv.id)}
							style:border-color={taker?.color}
							class="relative overflow-hidden border-4 text-left transition {taker
								? ''
								: viewing?.id === inv.id
									? 'border-foreground/50'
									: 'border-transparent'}"
						>
							<img
								src={inv.image}
								alt={inv.name}
								class="aspect-square w-full object-cover object-top {takenByOther ? 'opacity-60' : ''}"
							/>
							<span class="bg-background/80 absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-xs">
								{inv.name}
							</span>
							{#if taker}
								<span
									class="absolute top-0 left-0 max-w-full truncate px-1.5 py-0.5 text-xs font-semibold text-black"
									style:background-color={taker.color}
								>
									{takenByOther ? taker.name : 'You'}
								</span>
							{/if}
						</button>
					{/each}
				</div>

				<div
					bind:this={panel}
					class="relative order-first flex flex-col gap-3 border border-[#d8cba8] bg-[#f6efdc] p-4 text-[#3a3022] md:order-none"
				>
					{#if viewing}
						{#if viewing.id === myPick}
							{#key viewing.id}
								<img
									src={stamp}
									alt="Certified"
									class="stamp pointer-events-none absolute -top-3 -right-3 size-24"
								/>
							{/key}
						{/if}
						<div class="pr-20">
							<h2 class="text-xl font-bold">{viewing.name}</h2>
							<p class="text-[#7a6a4f]">{viewing.title} - {viewing.roles.join(', ')}</p>
						</div>
						<dl class="grid grid-cols-2 gap-x-4 gap-y-1 border-y border-[#d8cba8] py-2">
							{#each STAT_LABELS as [key, label] (key)}
								<dt class="text-[#7a6a4f]">{label}</dt>
								<dd class="text-right font-semibold">{viewing[key]}</dd>
							{/each}
						</dl>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-[#7a6a4f]">Starting location</p>
								<p>{viewing.location}</p>
							</div>
							<div>
								<p class="text-sm text-[#7a6a4f]">Starting possessions</p>
								<p>{viewing.possessions.join(', ')}</p>
							</div>
						</div>
						{#if viewingTaker && viewing.id !== myPick}
							<p class="font-semibold" style:color={viewingTaker.color}>
								Taken by {viewingTaker.name}
							</p>
						{/if}
						{#if myPick}
							<Button
								size="lg"
								variant="outline"
								onclick={cancel}
								class="border-[#3a3022] bg-transparent text-[#3a3022] hover:bg-[#3a3022]/10 hover:text-[#3a3022] dark:border-[#3a3022] dark:bg-transparent dark:hover:bg-[#3a3022]/10"
							>
								Cancel {getInvestigator(myPick)?.name}
							</Button>
						{:else}
							<Button
								size="lg"
								onclick={() => choose(viewing.id)}
								disabled={!!viewingTaker}
								class="bg-[#3a3022] text-[#f6efdc] hover:bg-[#2a2218]"
							>
								Select {viewing.name}
							</Button>
						{/if}
						{#if error}
							<p class="text-destructive text-sm">{error}</p>
						{/if}
					{:else}
						<p class="text-[#7a6a4f]">Tap an investigator to see their details.</p>
					{/if}
				</div>
			</Card.Content>
			<Card.Footer class="flex-col gap-2">
				{#if isHost}
					<Button size="lg" onclick={begin} disabled={!everyoneSelected || beginning}>
						{beginning ? 'Starting…' : 'Start Campaign'}
					</Button>
					{#if !everyoneSelected}
						<p class="text-muted-foreground text-sm">Waiting for all players to lock in.</p>
					{/if}
				{:else}
					<p class="text-muted-foreground text-sm">
						{everyoneSelected
							? 'Waiting for the host to start the campaign.'
							: 'Waiting for all players to lock in.'}
					</p>
				{/if}
			</Card.Footer>
		</Card.Root>
	{/if}
</main>

<style>
	.stamp {
		transform: rotate(-15deg);
		animation: stamp-in 0.3s ease-out;
	}

	@keyframes stamp-in {
		from {
			opacity: 0;
			transform: rotate(-15deg) scale(1.8);
		}
		to {
			opacity: 1;
			transform: rotate(-15deg) scale(1);
		}
	}
</style>
