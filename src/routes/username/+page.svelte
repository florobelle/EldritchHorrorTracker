<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { getUsername, setUsername } from '#lib/user.js';

	let name = $state('');
	const trimmed = $derived(name.trim());

	onMount(() => {
		name = getUsername() ?? '';
	});

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!trimmed) return;
		setUsername(trimmed);
		goto('/party');
	}
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<form onsubmit={save} class="flex flex-col gap-[inherit]">
			<Card.Header>
				<Card.Title class="text-2xl">Who are you?</Card.Title>
				<Card.Description>Choose a username to show to your party.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-6">
				<Input
					bind:value={name}
					maxlength={20}
					placeholder="Username"
					autocomplete="nickname"
					class="h-12 text-center text-lg"
				/>
				<Button size="lg" type="submit" disabled={!trimmed}>Continue</Button>
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/">Back</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</main>
