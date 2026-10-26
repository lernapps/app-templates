<script setup lang="ts">
// A field of G squares, together 100 %, of which the learner colours p % by tapping, and "Prüfen" in a row of its own
// (.question-actions, as the shared questions have it), for the task of the number seed. Its logic is in
// ProzentFeld.ts; it reports the answer with answered, the message of a typical mistake as its reason, and the
// explainer gives the feedback, the task number and "Neue Aufgabe".
import { computed, ref } from "vue";
import { check, fill, generate, reason, show } from "./ProzentFeld.ts";

const props = defineProps<{
  /** The task, with {G} for the number of squares and {p} for the percentage. */
  task: string;
  /** The count below the field, with {n} for the squares coloured and {G}. */
  counter: string;
  /** The name of a square for screen readers, with {n} for its number. */
  cell: string;
  /** The text of the button that checks the answer. */
  button: string;
  /** The app's message for each typical mistake, in the order of about.mistakes, with {G}, {p} and {n}. */
  mistakes: string[];
  /** The task number, which the explainer gives. */
  seed: number;
}>();
const emit = defineEmits<{ answered: [{ correct: boolean; reason?: string; answer?: string }] }>();

// the task of the number the explainer gives; "Neue Aufgabe" mounts the component afresh with another
const current = computed(() => generate(props.seed, props));
const coloured = ref<boolean[]>(Array.from({ length: current.value.G }, () => false));
const done = ref(false);
const count = computed(() => coloured.value.filter(Boolean).length);
// ten squares to a row, five for a field of 25
const columns = computed(() => (current.value.G === 25 ? 5 : 10));

function toggle(index: number): void {
  coloured.value[index] = !coloured.value[index];
}

function submit(): void {
  done.value = true;
  const why = reason(current.value, count.value, props);
  emit("answered", {
    correct: check(current.value, count.value),
    ...(why === undefined ? {} : { reason: why }),
    answer: show(count.value),
  });
}
</script>

<template>
  <div class="prozent-feld">
    <p>{{ fill(task, current) }}</p>
    <div class="prozent-feld-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
      <button
        v-for="(on, index) in coloured"
        :key="index"
        type="button"
        :aria-pressed="on"
        :aria-label="fill(cell, current, index + 1)"
        :disabled="done"
        @click="toggle(index)"
      ></button>
    </div>
    <p aria-live="polite">{{ fill(counter, current, count) }}</p>
    <p class="question-actions">
      <button type="button" :disabled="done" @click="submit">{{ button }}</button>
    </p>
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
</style>
