<script setup lang="ts">
// A placeholder: the count and a button that emits the action "weiter". Replace it with the planned component.
import { watch } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import type { Input } from "@lernapps/app-templates/interactive";
import { GOAL, type State } from "../core/index.ts";
import de from "../messages/de.json";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const t = translator(de);

watch(
  () => props.state.count,
  (count) => announce(props.state.done ? t("done") : t("count", { count, goal: GOAL })),
);
</script>

<template>
  <section :aria-label="t('app')">
    <p>{{ state.done ? t("done") : t("count", { count: state.count, goal: GOAL }) }}</p>
    <button v-if="!state.done" type="button" @click="emit('input', { kind: 'action', name: 'weiter' })">
      {{ t("next") }}
    </button>
  </section>
</template>
