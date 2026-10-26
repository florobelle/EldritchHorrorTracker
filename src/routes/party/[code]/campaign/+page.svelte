<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import { subscribeParty, type Party } from '#lib/party.js';

	const code = $derived(page.params.code ?? '');

	let party = $state<Party | null>(null);
	let userId = $state('');

	const members = $derived(
		Object.entries(party?.members ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
	);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		userId = getUserId();
		return subscribeParty(code, (value) => {
			party = value;
		});
	});
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Campaign started</Card.Title>
			<Card.Description>Party {code}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-2">
			{#each members as [id, member] (id)}
				<div class="bg-muted flex items-center justify-between px-3 py-2">
					<span>{member.name}{id === userId ? ' (you)' : ''}</span>
					{#if id === party?.host}
						<Badge>Host</Badge>
					{/if}
				</div>
			{/each}
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/">Home</Button>
		</Card.Footer>
	</Card.Root>
</main>
