<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import AutoPassSwitch from '#lib/components/auto-pass-switch.svelte';
	import { getUsername, getUserId, clearLastParty } from '#lib/user.js';
	import { getInvestigator } from '#lib/investigators.js';
	import {
		endCampaign,
		kickThreshold,
		kickVoteCount,
		setAutoPass,
		subscribeParty,
		toggleKickVote,
		wasKicked,
		type Party
	} from '#lib/party.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let userId = $state('');
	let ending = $state(false);
	let voting = $state(false);
	let error = $state<string | null>(null);

	const isHost = $derived(party?.host === userId);
	const others = $derived(
		Object.entries(party?.members ?? {})
			.filter(([id]) => id !== userId)
			.sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
	);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		userId = getUserId();
		return subscribeParty(code, (value) => {
			// The campaign was ended (deleted) by the host
			if (!value && party) {
				clearLastParty();
				goto('/', { replaceState: true });
			}
			if (value && !value.members?.[userId]) {
				goto(wasKicked(value, userId) ? `/party/${code}/kicked` : '/party/join', {
					replaceState: true
				});
				return;
			}
			party = value;
		});
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

	async function vote(targetId: string) {
		voting = true;
		error = null;
		try {
			await toggleKickVote(code, userId, targetId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not register your vote.';
		} finally {
			voting = false;
		}
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-8 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Settings</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col items-center gap-6">
			{#if !party}
				<p class="text-muted-foreground">Loading…</p>
			{:else}
				{#if isHost}
					<div class="flex w-full flex-col items-center gap-4">
						<AutoPassSwitch
							checked={party.game?.autoPass ?? false}
							disabled={party.game?.step !== 'action'}
							onchange={(value) => setAutoPass(code, value)}
						/>
						{#if party.game?.step !== 'action'}
							<p class="text-muted-foreground text-sm">
								Available once the Lead Investigator has been assigned.
							</p>
						{/if}
						<Button variant="destructive" onclick={end} disabled={ending}>
							{ending ? 'Ending…' : 'End Campaign'}
						</Button>
					</div>
				{:else}
					<p class="text-muted-foreground">Only the host can change campaign settings.</p>
				{/if}

				<div class="flex w-full flex-col gap-2 text-left">
					<div>
						<h2 class="text-lg font-bold">Vote to kick</h2>
						<p class="text-muted-foreground text-sm">
							A player is removed when {kickThreshold(party)}
							{kickThreshold(party) === 1 ? 'vote is' : 'votes are'} cast against them. They can rejoin afterwards.
						</p>
					</div>
					{#each others as [id, member] (id)}
						{@const voted = !!party.kickVotes?.[id]?.[userId]}
						<div class="bg-muted flex items-center justify-between gap-3 px-3 py-2">
							<div class="min-w-0">
								<p class="truncate">{member.name}</p>
								<p class="text-muted-foreground truncate text-sm">
									{getInvestigator(member.investigator)?.name ?? 'No investigator'} · {kickVoteCount(party, id)}/{kickThreshold(party)} votes
								</p>
							</div>
							<Button
								size="sm"
								variant={voted ? 'default' : 'outline'}
								disabled={voting}
								onclick={() => vote(id)}
							>
								{voted ? 'Withdraw' : 'Vote to kick'}
							</Button>
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">There are no other players to vote on.</p>
					{/each}
				</div>
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
			{/if}
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/party/{code}/campaign">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
