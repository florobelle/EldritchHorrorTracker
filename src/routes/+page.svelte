<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { getUsername } from '#lib/user.js';
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-xl py-10 text-center">
		<Card.Content class="flex flex-col items-center gap-8">
			<h1 class="flex flex-col items-center">
				<span class="text-muted-foreground text-xl sm:text-2xl">Welcome to</span>
				<span
					class="text-5xl font-extrabold tracking-wide text-emerald-400 sm:text-7xl"
				>
					ELDRITCH HORROR
				</span>
				<span class="text-muted-foreground text-xl sm:text-2xl">Tracker</span>
			</h1>
			<Button size="lg" onclick={() => goto(getUsername() ? '/party' : '/username')}>
					Begin
				</Button>
		</Card.Content>
	</Card.Root>
</main>
