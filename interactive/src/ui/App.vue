<script setup lang="ts">
// The game: the letter to type, the time left for it, the score; after the round the result and a button for the
// next round. It announces every change for screen readers. The runtime gives it the core's state and steps every
// key typed on the page; the button emits the action "again" as input.
import { computed, watch } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import type { Input } from "@lernapps/app-templates/interactive";
import { lessonOf, type State } from "../core/index.ts";
import de from "../messages/de.json";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const t = translator(de);

const letter = computed(() => props.state.letters[props.state.index] ?? "");
const total = computed(() => props.state.letters.length);
const timeLeft = computed(() => (100 * props.state.left) / (lessonOf(props.state.route).seconds * 1000));

watch(
  () => [props.state.index, props.state.misses, props.state.done, props.state.seed] as const,
  () => {
    const { state } = props;
    if (state.done) announce(t("done", { score: state.score, total: total.value }));
    else announce(t(state.last, { letter: letter.value }));
  },
);
</script>

<template>
  <section class="game" :aria-label="t('game')">
    <template v-if="!state.done">
      <p class="letter" aria-hidden="true">{{ letter }}</p>
      <p class="prompt">{{ t("type", { letter }) }}</p>
      <div class="time" aria-hidden="true"><div class="time-left" :style="{ width: `${timeLeft}%` }"></div></div>
    </template>
    <template v-else>
      <p class="result">{{ t("done", { score: state.score, total }) }}</p>
      <button type="button" class="again" @click="emit('input', { kind: 'action', name: 'again' })">
        {{ t("again") }}
      </button>
    </template>
    <p class="score">{{ t("score", { score: state.score, total }) }} · {{ t("misses", { misses: state.misses }) }}</p>
  </section>
</template>

<style scoped>
.game {
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f4f5f7;
  text-align: center;
}

.letter {
  margin: 0;
  font-size: 5rem;
  font-weight: 700;
  line-height: 1.2;
}

.time {
  height: 0.5rem;
  margin: 0.5rem auto;
  max-width: 20rem;
  border-radius: 0.25rem;
  background: #d1d5db;
  overflow: hidden;
}

.time-left {
  height: 100%;
  background: #1d4ed8;
}

.again {
  padding: 0.5rem 1.25rem;
  border: 0;
  border-radius: 0.375rem;
  background: #1d4ed8;
  color: #ffffff;
  font: inherit;
  font-weight: 600;
}
</style>
