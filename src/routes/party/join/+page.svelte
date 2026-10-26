<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as InputOTP from '#lib/components/ui/input-otp/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let code = $state('');
	let joinedCode = $state<string | null>(null);
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		{#if joinedCode}
			<Card.Header>
				<Card.Title class="text-2xl">Joined party</Card.Title>
				<Card.Description>You are in party {joinedCode}.</Card.Description>
			</Card.Header>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/party">Back</Button>
			</Card.Footer>
		{:else}
			<Card.Header>
				<Card.Title class="text-2xl">Join a party</Card.Title>
				<Card.Description>Enter the 4-digit party code.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-6">
				<InputOTP.Root maxlength={4} pattern="^[0-9]*$" inputmode="numeric" bind:value={code}>
					{#snippet children({ cells })}
						<InputOTP.Group>
							{#each cells as cell (cell)}
								<InputOTP.Slot {cell} class="size-14 text-2xl" />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
				<Button size="lg" disabled={code.length !== 4} onclick={() => (joinedCode = code)}>
					Join
				</Button>
			</Card.Content>
			<Card.Footer class="justify-center">
				<Button variant="ghost" href="/party">Back</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</main>
