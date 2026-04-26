<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Screenshots de teste/debug

Quando tirar screenshot via Playwright MCP, sempre salvar em:

```
docs/_sessions/<YYYY-MM-DD>-<tema>-screenshots/<nome-descritivo>.png
```

Nunca salvar PNG na raiz do repo nem dentro de `apps/web/` — está bloqueado pelo `.gitignore`. Se a pasta da sessão não existir, criar antes (`mkdir -p`).
