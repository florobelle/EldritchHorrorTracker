<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	const generateCode = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

	let code = $state(generateCode());
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-10 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Your party code</Card.Title>
			<Card.Description>Share this code with your fellow investigators.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-center gap-6">
			<p class="text-6xl font-extrabold tracking-[0.3em] text-emerald-400">{code}</p>
			<Button variant="outline" onclick={() => (code = generateCode())}>Regenerate</Button>
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/party">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
