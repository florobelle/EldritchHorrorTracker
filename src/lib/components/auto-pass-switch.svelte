<script lang="ts">
	let {
		checked,
		onchange,
		disabled = false
	}: { checked: boolean; onchange: (value: boolean) => void; disabled?: boolean } = $props();
</script>

<div class="bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
	<div>
		<p class="font-semibold">Automatically pass the lead</p>
		<p class="text-muted-foreground text-sm">
			After each Mythos Phase, the next player in turn order becomes the Lead Investigator.
		</p>
	</div>
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label="Automatically pass the lead"
		{disabled}
		onclick={() => onchange(!checked)}
		class="relative h-6 w-11 shrink-0 transition-colors disabled:opacity-50 {checked
			? 'bg-emerald-400'
			: 'bg-foreground/25'}"
	>
		<span
			class="bg-background absolute top-0.5 left-0.5 size-5 transition-transform {checked
				? 'translate-x-5'
				: ''}"
		></span>
	</button>
</div>
