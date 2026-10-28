<script setup lang="ts">
import { LtAlert, LtButton, LtTextField } from '@/lastro';
import { maskCpf } from '../domain/credentials';
import { useSignup } from '../application/useSignup';

const emit = defineEmits<{ signedIn: [] }>();
const { form, submit, pending, passwordRules, errorMessage } = useSignup({ onSignedIn: () => emit('signedIn') });
const typeDocument = (typed: string) => {
  form.values.document = maskCpf(typed);
};
</script>

<template>
  <form class="auth-form" aria-labelledby="signup-title" novalidate @submit.prevent="submit">
    <div class="auth-heading">
      <h1 id="signup-title" class="lt-page-title">Criar conta</h1>
      <p class="lt-muted">Depois do cadastro, deposite USD ou BTC para começar a operar.</p>
    </div>

    <LtAlert v-if="errorMessage" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />

    <LtTextField id="signup-name" v-model="form.values.name" label="Nome completo" autocomplete="name" :error="form.errors.name" @blur="form.touch('name')" />
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
    <LtTextField id="signup-password" v-model="form.values.password" label="Senha" type="password" autocomplete="new-password" :error="form.submitted.value ? form.errors.password : undefined" @blur="form.touch('password')">
      <ul class="password-rules" aria-label="Regras da senha">
        <li v-for="rule in passwordRules" :key="rule.label" :class="{ 'is-satisfied': rule.satisfied }">
          <span aria-hidden="true">{{ rule.satisfied ? '✓' : '○' }}</span> {{ rule.label }}<span class="lt-visually-hidden">{{ rule.satisfied ? ': ok' : ': pendente' }}</span>
        </li>
      </ul>
    </LtTextField>

    <LtButton type="submit" variant="primary" class="auth-submit" :loading="pending">Criar conta</LtButton>
    <p class="lt-muted auth-switch">Já tem conta? <RouterLink to="/entrar">Entrar</RouterLink></p>
    <p class="lt-muted auth-note">Este ambiente é uma prova de conceito: nenhum dinheiro de verdade é movimentado.</p>
  </form>
</template>
