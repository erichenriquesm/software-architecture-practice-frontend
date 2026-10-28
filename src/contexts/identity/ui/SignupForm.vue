<script setup lang="ts">
import { computed } from 'vue';
import { LtAlert, LtButton, LtTextField } from '@/lastro';
import { maskCpf } from '../domain/credentials';
import { useSignup } from '../application/useSignup';

const emit = defineEmits<{ signedIn: [] }>();
const { form, submit, pending, passwordRules, errorMessage } = useSignup({ onSignedIn: () => emit('signedIn') });
const typeDocument = (typed: string) => {
  form.values.document = maskCpf(typed);
};
const satisfied = computed(() => passwordRules.value.filter((rule) => rule.satisfied).length);
</script>

<template>
  <form class="auth-form lt-panel" aria-labelledby="signup-title" novalidate @submit.prevent="submit">
    <div class="auth-heading lt-rise">
      <p class="lt-eyebrow">Leva um minuto</p>
      <h1 id="signup-title" class="lt-page-title">Criar conta</h1>
      <p class="lt-muted">Depois do cadastro, deposite USD ou BTC para começar a operar.</p>
    </div>

    <Transition name="auth-alert">
      <LtAlert v-if="errorMessage" :key="errorMessage.title" class="auth-alert" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
    </Transition>

    <LtTextField id="signup-name" v-model="form.values.name" class="lt-rise lt-rise-1" label="Nome completo" autocomplete="name" :error="form.errors.name" @blur="form.touch('name')" />
    <div class="auth-pair lt-rise lt-rise-2">
      <LtTextField id="signup-email" v-model="form.values.email" label="E-mail" type="email" autocomplete="email" :error="form.errors.email" @blur="form.touch('email')" />
      <LtTextField
        id="signup-document"
        :model-value="form.values.document"
        label="CPF"
        inputmode="numeric"
        autocomplete="off"
        :error="form.errors.document"
        @update:model-value="typeDocument"
        @blur="form.touch('document')"
      />
    </div>
    <LtTextField
      id="signup-password"
      v-model="form.values.password"
      class="lt-rise lt-rise-3"
      label="Senha"
      type="password"
      autocomplete="new-password"
      :error="form.submitted.value ? form.errors.password : undefined"
      @blur="form.touch('password')"
    >
      <div class="password-meter" :data-level="satisfied" aria-hidden="true">
        <span v-for="segment in passwordRules.length" :key="segment" :class="{ 'is-on': segment <= satisfied }"></span>
      </div>
      <ul class="password-rules" aria-label="Regras da senha">
        <li v-for="rule in passwordRules" :key="rule.label" :class="{ 'is-satisfied': rule.satisfied }">
          <span class="password-check" aria-hidden="true"></span>
          {{ rule.label }}<span class="lt-visually-hidden">{{ rule.satisfied ? ': ok' : ': pendente' }}</span>
        </li>
      </ul>
    </LtTextField>

    <LtButton type="submit" variant="primary" class="auth-submit lt-rise lt-rise-4" :loading="pending">Criar conta</LtButton>
    <p class="lt-muted auth-switch lt-rise lt-rise-4">Já tem conta? <RouterLink to="/entrar">Entrar</RouterLink></p>
    <p class="lt-muted auth-note lt-rise lt-rise-4">Este ambiente é uma prova de conceito: nenhum dinheiro de verdade é movimentado.</p>
  </form>
</template>
