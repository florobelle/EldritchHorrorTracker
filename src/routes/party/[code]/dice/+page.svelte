<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { getUsername, getUserId } from '#lib/user.js';
	import { subscribeParty, type Party } from '#lib/party.js';
	import Minus from 'phosphor-svelte/lib/Minus';
	import Plus from 'phosphor-svelte/lib/Plus';

	const MIN_DICE = 1;
	const MAX_DICE = 8;
	/** Lowest face that counts as a success: 5 normally, 4 when Blessed, 6 when Cursed */
	const BASE_SUCCESS_AT = 5;
	/** Pip cells (0-8, row by row) lit for each face */
	const PIPS: Record<number, number[]> = {
		1: [4],
		2: [0, 8],
		3: [0, 4, 8],
		4: [0, 2, 6, 8],
		5: [0, 2, 4, 6, 8],
		6: [0, 2, 3, 5, 6, 8]
	};

	const code = $derived(page.params.code ?? '');

	let count = $state(1);
	const rollFace = () => Math.floor(Math.random() * 6) + 1;
	/** Faces currently shown; new dice start on a random face */
	let faces = $state<number[]>([rollFace()]);
	/** True once Roll Dice has been used for the current dice; hides the result until then */
	let rolled = $state(false);
	let rolling = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	let party = $state<Party | null>(null);
	let userId = $state('');

	const conditions = $derived(party?.members?.[userId]?.conditions ?? []);
	const blessed = $derived(conditions.includes('blessed'));
	const cursed = $derived(conditions.includes('cursed'));
	// Blessed and Cursed cancel each other out
	const successAt = $derived(
		blessed === cursed ? BASE_SUCCESS_AT : blessed ? BASE_SUCCESS_AT - 1 : BASE_SUCCESS_AT + 1
	);
	const successes = $derived(faces.filter((f) => f >= successAt).length);

	onMount(() => {
		if (!getUsername()) {
			goto('/username', { replaceState: true });
			return;
		}
		userId = getUserId();
		return subscribeParty(code, (value) => (party = value));
	});

	function step(delta: number) {
		const next = Math.min(MAX_DICE, Math.max(MIN_DICE, count + delta));
		if (next === count) return;
		count = next;
		faces = Array.from({ length: next }, (_, i) => faces[i] ?? rollFace());
		rolled = false;
	}

	function roll() {
		if (rolling) return;
		rolled = false;
		const final = Array.from({ length: count }, rollFace);
		rolling = true;
		let ticks = 0;
		timer = setInterval(() => {
			ticks++;
			if (ticks >= 8) {
				clearInterval(timer);
				faces = final;
				rolled = true;
				rolling = false;
				return;
			}
			faces = Array.from({ length: count }, rollFace);
		}, 70);
	}

	onDestroy(() => clearInterval(timer));
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md py-8 text-center">
		<Card.Header>
			<Card.Title class="text-2xl">Roll dice</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col items-center gap-6">
			<div class="flex items-center gap-4">
				<Button
					size="icon"
					variant="outline"
					aria-label="Fewer dice"
					disabled={count <= MIN_DICE}
					onclick={() => step(-1)}
				>
					<Minus class="size-5" />
				</Button>
				<p class="w-12 text-3xl font-bold">{count}</p>
				<Button
					size="icon"
					variant="outline"
					aria-label="More dice"
					disabled={count >= MAX_DICE}
					onclick={() => step(1)}
				>
					<Plus class="size-5" />
				</Button>
			</div>

			<ul class="grid grid-cols-4 gap-3">
				{#each Array.from({ length: count }, (_, i) => i) as i (i)}
					{@const face = faces[i]}
					<li
						class="grid size-16 grid-cols-3 grid-rows-3 gap-0.5 rounded-lg border-2 bg-[#f6efdc] p-2 text-[#3a3022] {rolled && face >= successAt
							? 'border-emerald-400'
							: 'border-[#d8cba8]'}"
						aria-label={`Die showing ${face}`}
					>
						{#each Array.from({ length: 9 }, (_, c) => c) as cell (cell)}
							<span
								class="m-auto size-2.5 rounded-full {PIPS[face].includes(cell)
									? 'bg-[#3a3022]'
									: ''}"
							></span>
						{/each}
					</li>
				{/each}
			</ul>

			{#if blessed !== cursed}
				<p class="text-muted-foreground -my-3 text-sm">
					{blessed ? 'Blessed: 4, 5 and 6 are successes.' : 'Cursed: only 6 is a success.'}
				</p>
			{/if}
			<p class="h-7 text-lg font-semibold">
				{#if rolled}
					{successes} {successes === 1 ? 'success' : 'successes'}
				{/if}
			</p>

			<Button size="lg" onclick={roll} disabled={rolling}>
				{rolling ? 'Rolling…' : 'Roll Dice'}
			</Button>
		</Card.Content>
		<Card.Footer class="justify-center">
			<Button variant="ghost" href="/party/{code}/campaign">Back</Button>
		</Card.Footer>
	</Card.Root>
</main>
