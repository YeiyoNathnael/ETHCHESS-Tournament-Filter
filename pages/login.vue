<template>
  <div class="login-page-wrap">
    <div class="login-card">
      <div class="card-brand-header">
        <img src="/ETHCHESS_logo.png" alt="ETHCHESS Logo" width="40" height="40" class="brand-img" />
        <h1 class="login-title">Organizer Control Access</h1>
        <p class="login-sub">Enter the secret organizer key to manage tournament rosters.</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="passcode" class="form-label">Organizer Passcode</label>
          <div class="input-wrap">
            <Lock class="input-icon" :size="16" />
            <input
              id="passcode"
              v-model="passcode"
              type="password"
              placeholder="Enter passcode..."
              class="form-input"
              required
              :disabled="isLoading"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          <AlertCircle :size="14" />
          <span>{{ errorMessage }}</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="isLoading">
          <LogIn v-if="!isLoading" :size="16" />
          <span>{{ isLoading ? 'Authenticating...' : 'Access Dashboard' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Lock, LogIn, AlertCircle } from 'lucide-vue-next';
import { useCookie } from '#app';

definePageMeta({
  layout: 'public',
});

const passcode = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const router = useRouter();

async function handleLogin() {
  if (!passcode.value.trim()) return;

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/login', {
      method: 'POST',
      body: { key: passcode.value },
    });

    if (res.success) {
      const cookie = useCookie('organizer_session');
      cookie.value = 'true';
      window.location.href = '/';
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Invalid passcode. Access denied.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-page-wrap {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  background: #ffffff;
  border: 1px solid rgba(15, 82, 87, 0.15);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.card-brand-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand-img {
  object-fit: contain;
  margin-bottom: 0.75rem;
}

.login-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
  margin-bottom: 0.25rem;
}

.login-sub {
  font-size: 0.8rem;
  color: #666;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #888;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.65rem 0.65rem 2.4rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 82, 87, 0.2);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-jade-primary, #00A86B);
}

.error-banner {
  background: rgba(217, 107, 67, 0.1);
  border: 1px solid rgba(217, 107, 67, 0.3);
  color: var(--color-terracotta, #D96B43);
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--color-jade-deep, #0F5257);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #00A86B;
}

.btn-block {
  width: 100%;
}
</style>
