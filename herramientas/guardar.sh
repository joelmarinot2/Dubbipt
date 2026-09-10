#!/usr/bin/env bash
# Guarda el trabajo si las pruebas están verdes. Nada más.
#
#   bash herramientas/guardar.sh
#
# Lo llama solo el hook de fin de turno (.claude/settings.local.json), pero se
# puede ejecutar a mano.
#
# ── Qué hace y qué NO hace ─────────────────────────────────────────────────
#
#   1. Si no hay nada cambiado, se calla y sale.
#   2. Si la rama es `main`, NO toca nada. Un commit automático a la rama
#      principal es la forma más rápida de romper lo que está en producción.
#   3. Corre las pruebas. Si están en rojo, NO commitea y lo dice.
#   4. Si están verdes: add, commit y push de la rama actual.
#   5. Si el push falla -la ventana de credenciales, sin red-, el commit se
#      queda hecho en local y lo dice. No se pierde nada.
#
# Nunca hace `--force`, nunca cambia de rama, nunca toca otra rama.
#
# ── Qué valen estos commits ────────────────────────────────────────────────
#
# Un mensaje automático puede decir QUÉ cambió, nunca POR QUÉ. Así que estos
# commits sirven para no perder trabajo, no para contar una historia. Antes de
# mezclar una rama conviene aplastarlos en uno escrito a mano.
#
# Escribe una línea JSON con `systemMessage` al final: es como el hook enseña
# el resultado en la interfaz.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 0

# Un solo mensaje, en JSON, escapando lo justo.
decir() {
  local m="$1"
  m="${m//\\/\\\\}"; m="${m//\"/\\\"}"; m="${m//$'\n'/\\n}"
  printf '{"systemMessage":"%s"}\n' "$m"
}

command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# ── 1 · ¿hay algo que guardar? ──────────────────────────────────────────────
cambios="$(git status --porcelain 2>/dev/null)"
[ -z "$cambios" ] && exit 0

rama="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"

# ── 2 · en main, no ─────────────────────────────────────────────────────────
if [ "$rama" = "main" ] || [ "$rama" = "master" ]; then
  decir "No he guardado nada: estás en «$rama». Crea una rama y lo guardo solo en cada turno."
  exit 0
fi

# ── 3 · las pruebas mandan ──────────────────────────────────────────────────
NODE="node"
command -v node >/dev/null 2>&1 || {
  for d in "$HOME"/node-portable/node-v*; do
    [ -x "$d/node.exe" ] && NODE="$d/node.exe" && break
  done
}
"$NODE" --version >/dev/null 2>&1 || { decir "No encuentro Node, así que no he podido correr las pruebas ni guardar nada."; exit 0; }

salida="$("$NODE" pruebas/correr.js 2>&1)"
if [ $? -ne 0 ]; then
  resumen="$(printf '%s' "$salida" | grep -E '^\s+✗' | head -4)"
  decir "PRUEBAS EN ROJO · no he guardado nada.$(printf '\n')$resumen"
  exit 0
fi

# ── 4 · guardar ─────────────────────────────────────────────────────────────
n="$(printf '%s\n' "$cambios" | grep -c .)"
lista="$(printf '%s\n' "$cambios" | awk '{ $1=""; sub(/^ /,""); print "  " $0 }' | head -20)"
verdes="$(printf '%s' "$salida" | grep -oE '[0-9]+ comprobaciones' | head -1)"

git add -A || { decir "No pude preparar los cambios."; exit 0; }

mensaje="auto: guardado con las pruebas en verde

$n archivo(s):
$lista

$verdes en verde. Commit automatico del hook de fin de turno
(herramientas/guardar.sh): sirve para no perder trabajo, no para contar por
que se hizo el cambio. Conviene aplastarlos antes de mezclar la rama."

if ! git commit -q -m "$mensaje" 2>/dev/null; then
  decir "No había nada que commitear después de todo."
  exit 0
fi
corto="$(git rev-parse --short HEAD)"

# ── 5 · subir ───────────────────────────────────────────────────────────────
if GIT_TERMINAL_PROMPT=0 git push -q --set-upstream origin "$rama" 2>/dev/null; then
  decir "Guardado y subido · $corto · $n archivo(s) · $verdes en verde · rama $rama"
else
  decir "Guardado en local · $corto · $n archivo(s) · $verdes en verde.$(printf '\n')El push no pasó (credenciales o sin red): ejecuta «git push» cuando puedas. Nada se ha perdido."
fi
exit 0
