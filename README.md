# software-architecture-practice-frontend

Cliente web da plataforma de trading: Vue 3 + TypeScript, Pinia, composables, Vue Query e o design system Lastro. A spec é o [capítulo 09 do sdd](https://github.com/erichenriquesm/software-architecture-practice/blob/main/sdd/09-frontend.md).

## Como rodar

O front tem porta própria e fala com a API pelo edge (`8080`): o dev server do Vite repassa as rotas da API para ele, então o browser vê uma origem só e o cookie de sessão funciona sem CORS. Pela raiz do [guarda-chuva](https://github.com/erichenriquesm/software-architecture-practice), `make up` sobe o backend e o front juntos. Para subir só o front, com o backend já de pé, rode aqui:

```bash
make up
```

Abra **http://localhost:5173** (use `localhost`: o cookie é `Secure`, e o browser só o aceita sem HTTPS em `localhost`). Alterar código não exige rebuild: o Vite recarrega pelo HMR (`make watch` usa o Compose Watch em primeiro plano).

| Comando | O quê |
|---|---|
| `make test-unit` | typecheck (`vue-tsc`), lint, regras de arquitetura e testes de unidade e de componente |
| `make e2e` | Playwright contra a plataforma no ar (o container do teste usa a rede do dev server e abre `localhost:5173`) |
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
