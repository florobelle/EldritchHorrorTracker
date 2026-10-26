<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Party</Card.Title>
			<Card.Description>Start a new party or join an existing one.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<Button size="lg" href="/party/create">Create a party</Button>
			<Button size="lg" variant="outline" href="/party/join">Join a party</Button>
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
