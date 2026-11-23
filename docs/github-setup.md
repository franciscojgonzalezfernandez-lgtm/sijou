# Configuración de GitHub

Configuración del repositorio que no vive en el código. Se aplica con `gh` (hace falta ser administrador del repositorio). Ver F-001 CA-6 y CA-8.

## Secret scanning y push protection (CA-8)

```bash
gh api -X PATCH repos/franciscojgonzalezfernandez-lgtm/sijou \
  -F 'security_and_analysis[secret_scanning][status]=enabled' \
  -F 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
```

## Opciones de merge

Solo squash, y la rama se borra al fusionar.

```bash
gh api -X PATCH repos/franciscojgonzalezfernandez-lgtm/sijou \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true
```

## Protección de `main` (CA-6)

- Solo se fusiona por PR, con 0 aprobaciones (hay un único desarrollador).
- Checks obligatorios: `quality`, `secrets`, `e2e` y `lighthouse`, y la rama debe estar al día con `main`.
- No se permiten force-push ni borrar la rama. Las reglas también aplican a los administradores.

```bash
gh api -X PUT repos/franciscojgonzalezfernandez-lgtm/sijou/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "quality" },
      { "context": "secrets" },
      { "context": "e2e" },
      { "context": "lighthouse" }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
JSON
```

Comprobación: `gh api repos/franciscojgonzalezfernandez-lgtm/sijou/branches/main/protection`.
