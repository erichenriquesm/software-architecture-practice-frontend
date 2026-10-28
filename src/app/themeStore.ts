import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Theme = 'dark' | 'light';
const storageKey = 'lastro.theme';

const readSaved = (): Theme => {
  try {
    return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** Dark by default (index.html applies the saved choice before the first paint). */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(readSaved());

  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme.value;
    try {
      localStorage.setItem(storageKey, theme.value);
    } catch {
      return;
    }
  };

  return { theme, toggle };
});
