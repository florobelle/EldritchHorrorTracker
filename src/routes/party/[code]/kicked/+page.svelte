<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId, setUserId, setLastParty, clearLastParty } from '#lib/user.js';
	import { joinParty, subscribeParty, type Party } from '#lib/party.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let loading = $state(true);
	let rejoining = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		const userId = getUserId();
		return subscribeParty(code, (value) => {
			party = value;
			loading = false;
			// Back in the party (e.g. rejoined from another device)
			if (value?.members?.[userId]) goto(`/party/${code}/campaign`, { replaceState: true });
		});
	});

	async function rejoin() {
		const name = getUsername();
		if (!name) return;
		rejoining = true;
		error = null;
		try {
			setUserId(await joinParty(code, getUserId(), name));
			setLastParty(code);
			await goto(`/party/${code}/campaign`, { replaceState: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not rejoin the campaign.';
			rejoining = false;
		}
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		{#if loading}
			<Card.Header>
				<Card.Description>Loading…</Card.Description>
			</Card.Header>
		{:else if !party}
			<Card.Header>
				<Card.Title class="text-2xl">Campaign ended</Card.Title>
				<Card.Description>Party {code} no longer exists.</Card.Description>
			</Card.Header>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/" onclick={clearLastParty}>Home</Button>
			</Card.Footer>
		{:else}
			<Card.Header>
				<Card.Title class="text-2xl">You've been kicked</Card.Title>
				<Card.Description>The other players voted you out of party {code}.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-4">
				<Button size="lg" onclick={rejoin} disabled={rejoining}>
					{rejoining ? 'Rejoining…' : 'Rejoin campaign'}
				</Button>
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/">Home</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</main>
