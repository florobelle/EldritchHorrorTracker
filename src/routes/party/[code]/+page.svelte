<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import { MAX_PLAYERS, startParty, subscribeParty, type Party } from '#lib/party.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let loading = $state(true);
	let starting = $state(false);
	let error = $state<string | null>(null);
	let userId = $state('');

	const members = $derived(
		Object.entries(party?.members ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
	);
	const isHost = $derived(party?.host === userId);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		userId = getUserId();
		return subscribeParty(code, (value) => {
			party = value;
			loading = false;
			if (!value) return;
			if (!value.members?.[userId]) {
				goto('/party/join', { replaceState: true });
			} else if (value.status === 'started') {
				goto(`/party/${code}/campaign`, { replaceState: true });
			}
		});
	});

	async function start() {
		starting = true;
		error = null;
		try {
			await startParty(code);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not start the campaign.';
			starting = false;
		}
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		{#if loading}
			<Card.Header>
				<Card.Description>Loading party…</Card.Description>
			</Card.Header>
		{:else if !party}
			<Card.Header>
				<Card.Title class="text-2xl">Party not found</Card.Title>
				<Card.Description>Party {code} doesn't exist.</Card.Description>
			</Card.Header>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/party">Back</Button>
			</Card.Footer>
		{:else}
			<Card.Header>
				<Card.Title class="text-2xl">Party code</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-6">
				<p class="text-6xl font-extrabold tracking-[0.3em] text-emerald-400">{code}</p>
				<div class="w-full">
					<p class="text-muted-foreground mb-2">Players ({members.length}/{MAX_PLAYERS})</p>
					<ul class="flex flex-col gap-2">
						{#each members as [id, member] (id)}
							<li class="bg-muted flex items-center justify-between px-3 py-2">
								<span>{member.name}{id === userId ? ' (you)' : ''}</span>
								{#if id === party.host}
									<Badge>Host</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
				{#if isHost}
					<Button size="lg" onclick={start} disabled={starting}>
						{starting ? 'Starting…' : 'Start Campaign'}
					</Button>
				{:else}
					<p class="text-muted-foreground">Please wait for the host to start the campaign.</p>
				{/if}
				{#if error}
					<p class="text-destructive">{error}</p>
				{/if}
			</Card.Content>
		{/if}
	</Card.Root>
</main>
