<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import AutoPassSwitch from '#lib/components/auto-pass-switch.svelte';
	import { getUsername, getUserId, clearLastParty } from '#lib/user.js';
	import { endCampaign, setAutoPass, subscribeParty, type Party } from '#lib/party.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let userId = $state('');
	let ending = $state(false);
	let error = $state<string | null>(null);

	const isHost = $derived(party?.host === userId);

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
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-8 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Settings</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col items-center gap-4">
			{#if !party}
				<p class="text-muted-foreground">Loading…</p>
			{:else if isHost}
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
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
			{:else}
				<p class="text-muted-foreground">Only the host can change campaign settings.</p>
			{/if}
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/party/{code}/campaign">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
