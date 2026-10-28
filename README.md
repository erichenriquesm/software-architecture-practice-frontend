# software-architecture-practice-frontend

Cliente web da plataforma de trading: Vue 3 + TypeScript, Pinia, composables, Vue Query e o design system Lastro. A spec é o [capítulo 09 do sdd](https://github.com/erichenriquesm/software-architecture-practice/blob/main/sdd/09-frontend.md).

## Como rodar

O front fala só com o edge (`http://127.0.0.1:8080`), na mesma origem da API. Suba o backend primeiro (`backend/`: `make up`) e depois:

```bash
make up
```

Abra `http://127.0.0.1:8080`. Alterar código não exige rebuild: o Vite recarrega pelo HMR (`make watch` usa o Compose Watch em primeiro plano).

| Comando | O quê |
|---|---|
| `make test-unit` | typecheck (`vue-tsc`), lint, regras de arquitetura e testes de unidade e de componente |
| `make e2e` | Playwright contra a plataforma no ar, pelo edge |
| `make build` | imagem de produção (nginx com o `dist/`; o build roda o `test-unit`) |
| `make deps` | `node_modules` na sua máquina, para o editor |

## Estrutura

```
src/
  app/        main.ts, App.vue, router e guarda, Vue Query, tema
  pages/      uma por rota; só compõe contextos
  lastro/     design system: tokens e componentes Lt*
  contexts/   identity, market, orderTicket, orders, wallet
              domain/ (regras puras) · application/ (composables e stores) · infra/ (*.api.ts) · ui/ (.vue)
  entities/   tipos e regras usados por 2+ contextos (decimal, mercado, ordem)
  shared/     cliente HTTP, erros, formulário, logger
test/         unit/ e component/ (espelham src/), support/
```

Um contexto nunca importa outro; componente não chama a API; o domínio não importa Vue. O lint e o dependency-cruiser garantem.
