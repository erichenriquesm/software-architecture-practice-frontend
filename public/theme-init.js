// Dark is the default; light only when the user chose it.
try {
  if (localStorage.getItem('lastro.theme') === 'light') document.documentElement.dataset.theme = 'light';
} catch {
  /* storage blocked: keep dark */
}
