<script setup lang="ts">
import type { OrderStep, OrderStepState } from '../domain/order';

const props = defineProps<{ steps: readonly OrderStep[] }>();

const captions: Readonly<Record<OrderStepState, string>> = {
  done: 'Feito',
  current: 'Agora',
  upcoming: 'A seguir',
  failed: 'Encerrada aqui',
  skipped: 'Não aconteceu',
  unknown: 'Sem registro',
};
const reached = (state: OrderStepState) => state === 'done' || state === 'current' || state === 'failed';
</script>

<template>
  <ol class="order-steps" aria-label="Andamento da ordem">
    <li
      v-for="(step, index) in props.steps"
      :key="step.key"
      :class="['order-step', `is-${step.state}`, `tone-${step.tone}`, { 'is-reached': reached(step.state), 'next-reached': reached(props.steps[index + 1]?.state ?? 'upcoming') }]"
      :style="{ '--step': index }"
      :aria-current="step.state === 'current' ? 'step' : undefined"
    >
      <span class="order-step-marker" aria-hidden="true"></span>
      <span class="order-step-text">
        <span class="order-step-label">{{ step.label }}</span><span class="lt-visually-hidden">, </span>
        <span class="order-step-caption">{{ captions[step.state] }}</span>
      </span>
    </li>
  </ol>
</template>
