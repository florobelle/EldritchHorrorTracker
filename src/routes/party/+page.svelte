<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import { createParty } from '#lib/party.js';

	let username = $state<string | null>(null);
	let creating = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		username = getUsername();
		if (!username) goto('/username', { replaceState: true });
	});

	async function create() {
		if (!username) return;
		creating = true;
		error = null;
		try {
			const code = await createParty(getUserId(), username);
			await goto(`/party/${code}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create the party.';
			creating = false;
		}
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Party</Card.Title>
			<Card.Description>
				{#if username}
					Playing as <span class="text-foreground font-semibold">{username}</span>.
					<a href="/username" class="underline underline-offset-4">Change</a>
				{:else}
					Start a new party or join an existing one.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<Button size="lg" onclick={create} disabled={!username || creating}>
				{creating ? 'Creating…' : 'Create a party'}
			</Button>
			<Button size="lg" variant="outline" href="/party/join">Join a party</Button>
			{#if error}
				<p class="text-destructive">{error}</p>
			{/if}
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
