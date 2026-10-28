<script setup lang="ts">
import { LtAlert, LtButton, LtTextField } from '@/lastro';
import { useLogin } from '../application/useLogin';

const emit = defineEmits<{ signedIn: [] }>();
const { form, submit, pending, errorMessage, blocked } = useLogin({ onSignedIn: () => emit('signedIn') });
</script>

<template>
  <form class="auth-form lt-panel" aria-labelledby="login-title" novalidate @submit.prevent="submit">
    <div class="auth-heading lt-rise">
      <p class="lt-eyebrow">Bem-vindo de volta</p>
      <h1 id="login-title" class="lt-page-title">Entrar</h1>
      <p class="lt-muted">Use o e-mail e a senha do cadastro.</p>
    </div>

    <Transition name="auth-alert">
      <LtAlert v-if="errorMessage" :key="errorMessage.title" :class="['auth-alert', { 'is-blocked': blocked }]" :tone="blocked ? 'warning' : 'danger'" :title="errorMessage.title" :detail="errorMessage.detail" />
    </Transition>

    <LtTextField id="login-email" v-model="form.values.email" class="lt-rise lt-rise-1" label="E-mail" type="email" autocomplete="username" :error="form.errors.email" :disabled="blocked" @blur="form.touch('email')" />
    <LtTextField id="login-password" v-model="form.values.password" class="lt-rise lt-rise-2" label="Senha" type="password" autocomplete="current-password" :error="form.errors.password" :disabled="blocked" @blur="form.touch('password')" />

    <LtButton type="submit" variant="primary" class="auth-submit lt-rise lt-rise-3" :loading="pending" :disabled="blocked">Entrar</LtButton>
    <p class="lt-muted auth-switch lt-rise lt-rise-4">Ainda não tem conta? <RouterLink to="/cadastro">Criar conta</RouterLink></p>
  </form>
</template>
