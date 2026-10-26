<script setup lang="ts">
// A figure whose parts the learner labels: a pyramid of numbered levels and a choice of the labels for each level, for
// the task of the number seed. Its logic is in AssignLabels.ts; it emits the answer with answer once a level has a
// label, and the explainer draws "Prüfen", checks it and gives the feedback, the task number and "Neue Aufgabe".
import { computed, ref, watch } from "vue";
import { generate, type Answer } from "./AssignLabels.ts";

const props = defineProps<{
  /** What the figure shows, for screen readers. */
  alt: string;
  /** The question above the choices. */
  question: string;
  /** The name of a level, numbered from the top: "Stufe" for "Stufe 1". */
  level: string;
  /** The labels of the levels, from the top: the right answer. */
  parts: string[];
  /** The app's message for each typical mistake, in the order of about.mistakes. */
  reasons: string[];
  /** The task number, which the explainer gives. */
  seed: number;
  /** Whether the explainer checked the answer the choices give now. */
  checked: boolean;
}>();
const emit = defineEmits<{ answer: [Answer | undefined] }>();

const HEIGHT = 180;
// the task of the number the explainer gives; "Neue Aufgabe" mounts the component afresh with another
const task = computed(() => generate(props.seed, props));
const answer = ref<Answer>(props.parts.map(() => -1));
// an answer once a level has a label
watch(answer, (value) => emit("answer", value.some((label) => label >= 0) ? [...value] : undefined), { deep: true });

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
</script>

<template>
  <div class="assign-labels">
    <svg :viewBox="`0 0 200 ${HEIGHT}`" role="img" :aria-label="alt">
      <g v-for="(shape, index) in levels" :key="index">
        <polygon :points="shape.points" fill="#e8ecf4" stroke="#1a1a1a" />
        <text x="100" :y="shape.y" text-anchor="middle" font-size="16">{{ index + 1 }}</text>
      </g>
    </svg>
    <fieldset :class="{ 'assign-labels-checked': checked }">
      <legend>{{ question }}</legend>
      <p v-for="(_part, index) in parts" :key="index">
        <label>
          {{ level }} {{ index + 1 }}
          <select v-model.number="answer[index]">
            <option :value="-1">–</option>
            <option v-for="label in task.order" :key="label" :value="label">{{ parts[label] }}</option>
          </select>
        </label>
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
