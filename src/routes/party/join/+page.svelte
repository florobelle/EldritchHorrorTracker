<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as InputOTP from '#lib/components/ui/input-otp/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import { joinParty } from '#lib/party.js';

	let code = $state('');
	let username = $state<string | null>(null);
	let joining = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		username = getUsername();
		if (!username) goto('/username', { replaceState: true });
	});

	async function join() {
		if (!username) return;
		joining = true;
		error = null;
		try {
			await joinParty(code, getUserId(), username);
			await goto(`/party/${code}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not join the party.';
			joining = false;
		}
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Join a party</Card.Title>
			<Card.Description>Enter the 4-digit party code.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-center gap-6">
			<InputOTP.Root
				maxlength={4}
				pattern="^[0-9]*$"
				inputmode="numeric"
				bind:value={code}
				onValueChange={() => (error = null)}
			>
				{#snippet children({ cells })}
					<InputOTP.Group>
						{#each cells as cell (cell)}
							<InputOTP.Slot {cell} class="size-14 text-2xl" />
						{/each}
					</InputOTP.Group>
				{/snippet}
			</InputOTP.Root>
			<Button size="lg" disabled={code.length !== 4 || !username || joining} onclick={join}>
				{joining ? 'Joining…' : 'Join'}
			</Button>
			{#if error}
				<p class="text-destructive">{error}</p>
			{/if}
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/party">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
