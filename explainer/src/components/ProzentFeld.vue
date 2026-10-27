<script setup lang="ts">
// A field of G squares, together 100 %, of which the learner colours p % by tapping, for the task of the number seed.
// Its logic is in ProzentFeld.ts. It is the input of the task: it emits the number of squares coloured with answer,
// and the explainer draws "Prüfen", checks the answer, gives the feedback with the message of a typical mistake, the
// task number and "Neue Aufgabe". Once the answer is checked, the field shows it as it is until the learner changes it.
import { computed, ref } from "vue";
import { fill, generate } from "./ProzentFeld.ts";

const props = defineProps<{
  /** The task, with {G} for the number of squares and {p} for the percentage. */
  task: string;
  /** The count below the field, with {n} for the squares coloured and {G}. */
  counter: string;
  /** The name of a square for screen readers, with {n} for its number. */
  cell: string;
  /** The app's message for each typical mistake, in the order of about.mistakes, with {G}, {p} and {n}. */
  mistakes: string[];
  /** The task number, which the explainer gives. */
  seed: number;
  /** Whether the explainer checked the answer the field gives now. */
  checked: boolean;
}>();
const emit = defineEmits<{ answer: [number] }>();

// the task of the number the explainer gives; "Neue Aufgabe" mounts the component afresh with another
const current = computed(() => generate(props.seed, props));
const coloured = ref<boolean[]>(Array.from({ length: current.value.G }, () => false));
const count = computed(() => coloured.value.filter(Boolean).length);
// ten squares to a row, five for a field of 25
const columns = computed(() => (current.value.G === 25 ? 5 : 10));

function toggle(index: number): void {
  coloured.value[index] = !coloured.value[index];
  emit("answer", count.value);
}
</script>

<template>
  <div class="prozent-feld">
    <p>{{ fill(task, current) }}</p>
    <div
      class="prozent-feld-grid"
      :class="{ 'prozent-feld-checked': checked }"
      :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    >
      <button
        v-for="(on, index) in coloured"
        :key="index"
        type="button"
        :aria-pressed="on"
        :aria-label="fill(cell, current, index + 1)"
        @click="toggle(index)"
      ></button>
    </div>
    <p aria-live="polite">{{ fill(counter, current, count) }}</p>
  </div>
</template>

<style scoped>
.prozent-feld-grid {
  display: grid;
  gap: 2px;
  max-width: 20rem;
}

.prozent-feld-grid button {
  aspect-ratio: 1;
  min-width: 1.5rem;
  min-height: 1.5rem;
  padding: 0;
  border: 1px solid #1a1a1a;
  border-radius: 0;
  background: #fff;
}

.prozent-feld-grid button[aria-pressed="true"] {
  background: #2f5fb3;
}

/* the answer checked: its squares a little lighter until the learner changes it */
.prozent-feld-checked button[aria-pressed="true"] {
  background: #5b7fc4;
}
</style>
