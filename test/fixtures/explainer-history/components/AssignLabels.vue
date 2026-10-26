<script setup lang="ts">
// A figure whose parts the learner labels: a pyramid of numbered levels, a choice of the labels for each level, and
// "Prüfen" in a row of its own (.question-actions, as the shared questions have it), for the task of the number seed. Its logic is in AssignLabels.ts; it reports the answer with answered, and
// the explainer gives the feedback, the task number and "Neue Aufgabe".
import { computed, ref } from "vue";
import { check, generate, type Answer } from "./AssignLabels.ts";

const props = defineProps<{
  /** What the figure shows, for screen readers. */
  alt: string;
  /** The question above the choices. */
  question: string;
  /** The name of a level, numbered from the top: "Stufe" for "Stufe 1". */
  level: string;
  /** The text of the button that checks the answer. */
  button: string;
  /** The labels of the levels, from the top: the right answer. */
  parts: string[];
  /** The task number, which the explainer gives. */
  seed: number;
}>();
const emit = defineEmits<{ answered: [{ correct: boolean }] }>();

const HEIGHT = 180;
// the task of the number the explainer gives; "Neue Aufgabe" mounts the component afresh with another
const task = computed(() => generate(props.seed, props));
const answer = ref<Answer>(props.parts.map(() => -1));
const done = ref(false);

const levels = computed(() =>
  props.parts.map((_part, index) => {
    const top = (index * HEIGHT) / props.parts.length;
    const bottom = ((index + 1) * HEIGHT) / props.parts.length;
    const half = (y: number) => (100 * y) / HEIGHT;
    return {
      points: `${100 - half(top)},${top} ${100 + half(top)},${top} ${100 + half(bottom)},${bottom} ${100 - half(bottom)},${bottom}`,
      y: (top + bottom) / 2 + (index === 0 ? 12 : 6),
    };
  }),
);

function submit(): void {
  done.value = true;
  emit("answered", { correct: check(task.value, answer.value) });
}
</script>

<template>
  <div class="assign-labels">
    <svg :viewBox="`0 0 200 ${HEIGHT}`" role="img" :aria-label="alt">
      <g v-for="(shape, index) in levels" :key="index">
        <polygon :points="shape.points" fill="#e8ecf4" stroke="#1a1a1a" />
        <text x="100" :y="shape.y" text-anchor="middle" font-size="16">{{ index + 1 }}</text>
      </g>
    </svg>
    <fieldset>
      <legend>{{ question }}</legend>
      <p v-for="(_part, index) in parts" :key="index">
        <label>
          {{ level }} {{ index + 1 }}
          <select v-model.number="answer[index]" :disabled="done">
            <option :value="-1">–</option>
            <option v-for="label in task.order" :key="label" :value="label">{{ parts[label] }}</option>
          </select>
        </label>
      </p>
      <p class="question-actions">
        <button type="button" :disabled="done" @click="submit">{{ button }}</button>
      </p>
    </fieldset>
  </div>
</template>

<style scoped>
.assign-labels svg {
  display: block;
  width: 100%;
  max-width: 14rem;
  height: auto;
}

.assign-labels select {
  margin-left: 0.5rem;
}
</style>
