# Retired Modular Workflows — 30 July 2026

These files were moved out of `outputs/modular/` during security-hardening phase 1. They were not deleted and can be restored if required.

## Superseded versions

- Workflow 07: versions 1–5 retired; v6 remains in `outputs/modular/`.
- Workflow 08: versions 1–3 retired; v4 remains in `outputs/modular/`.
- Workflow 08a: version 1 retired; v2 remains in `outputs/modular/`.

## Live exports

`live-exports/` contains the active n8n exports supplied on 30 July 2026 for workflows 13 and 14. Their business logic and connections matched the canonical files; they differed in n8n metadata, active state and JSON property ordering.

- Workflow 13 live export SHA-256: `9b3d9df268e23f0123d5dcdef20b2040326aea9c7750f9d464a18aec075d5c17`
- Workflow 14 live export SHA-256: `3cd556b7a56cc73f685f7b637922aab631551c4898b1216759f5b77293620dd2`

Do not import archived files alongside the canonical versions because duplicate webhook paths may prevent activation or route traffic to the wrong workflow.
