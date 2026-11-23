# F-001 — Repositorio y puertas de calidad

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-11, RNF-15, RNF-16 |
| Depende de | — |

## Contexto
Antes de escribir cualquier feature, el repositorio debe impedir automáticamente que se fusione código que no cumpla la constitución: tipos, lint, pruebas unitarias, pruebas E2E, accesibilidad y Lighthouse ≥ 90.

## Historias de usuario
- **HU-1** Como desarrollador, quiero que cada PR se valide automáticamente para no romper la calidad sin darme cuenta.
- **HU-2** Como desarrollador, quiero ejecutar las mismas comprobaciones en local con un solo comando.

## Criterios de aceptación
- **CA-1** Un PR con un error de tipos, de lint o de formato no se puede fusionar.
- **CA-2** Un PR con una prueba unitaria fallida no se puede fusionar. Se publica un informe de cobertura.
- **CA-3** Las pruebas E2E se ejecutan contra el deploy de preview del PR, con un perfil móvil y uno de escritorio. Si falla alguna, el PR no se puede fusionar.
- **CA-4** axe se ejecuta en cada página que visitan las pruebas E2E. Cualquier violación hace fallar la prueba.
- **CA-5** Lighthouse CI audita las URLs públicas configuradas, con perfil móvil. Si alguna categoría baja de 90, el PR no se puede fusionar. El informe queda enlazado en el PR.
- **CA-6** La rama `main` está protegida: solo se fusiona por PR y con todas las comprobaciones en verde.
- **CA-7** El gestor de paquetes es pnpm. Hay un comando local que ejecuta lint, comprobación de tipos y pruebas unitarias. Otro comando ejecuta las E2E.
- **CA-8** Un PR que intente subir un secreto conocido (claves de Stripe, tokens) se bloquea con un escaneo de secretos.
- **CA-9** Las dependencias se actualizan con PRs automáticos agrupados.

## Estrategia de pruebas
- Unitarias: una prueba de ejemplo que valida la configuración.
- E2E: una prueba de humo de la página inicial con axe.
- Verificación: un PR de prueba con un error deliberado de cada tipo debe quedar bloqueado.

## Casos límite y errores
- Si el preview tarda en desplegarse, las E2E y Lighthouse esperan a que esté listo y fallan con un mensaje claro si se agota el tiempo.
- Lighthouse varía entre ejecuciones: se toman 3 ejecuciones por URL y cuenta la mediana.

## Fuera de alcance
- Pruebas de carga.

## Dudas
- Ninguna.
