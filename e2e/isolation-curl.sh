#!/usr/bin/env bash
# T0.6.1 isolation check with plain curl, independent of Playwright.
# Creates the two-organisation fixture, has org A's admin create data, then
# sends org B's admin at it. Prints one line per request; exits 1 on findings.
#
#   cx-api must be running (python scripts.py dev) on $API (default :8000).
#   Usage: bash e2e/isolation-curl.sh        (KEEP=1 keeps the fixture)
set -u
API="${API:-http://localhost:8000}"
HERE="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$HERE/../../cx-api"
PY="${E2E_API_PYTHON:-$API_DIR/venv/Scripts/python.exe}"
[ -x "$PY" ] || PY="$API_DIR/venv/bin/python"
JAR="$(mktemp -d)"
PASSWORD='Password123!'
findings=0; checks=0

js() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log($1)"; }
login() { # $1 jar name, $2 email
  curl -s -o /dev/null -w "%{http_code}" -c "$JAR/$1" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$2\",\"password\":\"$PASSWORD\"}" "$API/auth/employee/login"
}
call() { # $1 jar, $2 method, $3 path, [$4 json] -> prints "status body"
  local args=(-s -b "$JAR/$1" -X "$2" -w $'\n%{http_code}' "$API$3")
  [ $# -ge 4 ] && args+=(-H 'Content-Type: application/json' -d "$4")
  curl "${args[@]}"
}
make() { # as A: $1 method, $2 path, $3 json, $4 id field -> id
  local out; out="$(call A "$1" "$2" "$3")"
  local code="${out##*$'\n'}" body="${out%$'\n'*}"
  if [[ "$code" != 20* ]]; then echo "setup failed: $1 $2 -> $code $body" >&2; exit 2; fi
  echo "$body" | js "d.${4:-id}"
}
attack() { # as B: must be 403/404
  local out; out="$(call B "$@")"; local code="${out##*$'\n'}"
  checks=$((checks+1))
  if [[ "$code" == 403 || "$code" == 404 ]]; then printf '  ok    %s %s %s\n' "$code" "$1" "$2"
  else findings=$((findings+1)); printf '  LEAK  %s %s %s\n' "$code" "$1" "$2"; fi
}
listing() { # as B: refused, or no $2 in the ids
  local out; out="$(call B GET "$1")"; local code="${out##*$'\n'}" body="${out%$'\n'*}"
  checks=$((checks+1))
  if [[ "$code" == 403 || "$code" == 404 ]]; then printf '  ok    %s GET %s (list)\n' "$code" "$1"; return; fi
  local hit; hit="$(echo "$body" | js "(Array.isArray(d)?d:(d.items||[])).some(i=>String(i.id)==='$2')")"
  if [[ "$code" == 200 && "$hit" == false ]]; then printf '  ok    %s GET %s (list)\n' "$code" "$1"
  else findings=$((findings+1)); printf '  LEAK  %s GET %s (list shows A'"'"'s %s)\n' "$code" "$1" "$2"; fi
}

echo "fixture"
FX="$(cd "$API_DIR" && "$PY" scripts.py e2e:isolation | tail -1)"
A_ORG=$(echo "$FX" | js d.A.org_id); A_UNIT=$(echo "$FX" | js d.A.unit_id)
B_ORG=$(echo "$FX" | js d.B.org_id); B_UNIT=$(echo "$FX" | js d.B.unit_id); B_EMP=$(echo "$FX" | js d.B.employee_id)
echo "  A org $A_ORG, B org $B_ORG"
[ "$(login A isolation-a@example.com)" = 200 ] || { echo "login A failed"; exit 2; }
[ "$(login B isolation-b@example.com)" = 200 ] || { echo "login B failed"; exit 2; }
[ "$(login P platform@acme.com)" = 200 ] || { echo "login platform failed"; exit 2; }

echo "A's data"
S=$(date +%s)
UNIT=$(make POST /units "{\"name\":\"A child\",\"organisation_id\":$A_ORG,\"parent_unit_id\":$A_UNIT}")
EMP=$(make POST /employees "{\"first_name\":\"Ann\",\"last_name\":\"A\",\"username\":\"curl_a_$S\",\"email\":\"curl-a-$S@example.com\",\"password\":\"secret123\",\"unit_id\":$A_UNIT}")
FORM=$(make POST /forms '{"name":"curl iso form","type":"questionnaire","submitter_type":["employee"],"fields":[{"question":"Q","type":"text","order":0}]}')
call A POST "/forms/$FORM/activate" >/dev/null
ASSIGN=$(make POST /assignments "{\"user_id\":$EMP,\"unit_id\":$UNIT,\"description\":\"curl\"}")
out="$(call P POST /tenants "{\"name\":\"curl tenant\",\"email\":\"t@example.com\",\"organisation_id\":$A_ORG}")"
TENANT=$(echo "${out%$'\n'*}" | js d.id)
KW=$(make POST /keywords "{\"phrase\":\"curl\",\"tenant_id\":\"$TENANT\"}")
echo "  unit $UNIT, employee $EMP, form $FORM, assignment $ASSIGN, tenant $TENANT, keyword $KW"

echo "B's attempts"
listing "/employees" "$EMP"
listing "/forms" "$FORM"
listing "/lookups/forms" "$FORM"
listing "/assignments" "$ASSIGN"
listing "/units?organisation_id=$A_ORG" "$UNIT"
listing "/keywords?tenant_id=$TENANT" "$KW"
attack GET "/employees/$EMP"
attack GET "/forms/$FORM"
attack PATCH "/forms/$FORM" '{"name":"curl hacked"}'
attack GET "/units/$UNIT?organisation_id=$A_ORG"
attack PATCH "/units/$UNIT?organisation_id=$A_ORG" '{"name":"curl hacked"}'
attack GET "/assignments/$ASSIGN"
attack PATCH "/assignments/$ASSIGN" '{"description":"curl hacked"}'
attack GET "/keywords/$KW"
attack POST /units "{\"name\":\"B in A\",\"organisation_id\":$A_ORG}"
attack POST /employees "{\"first_name\":\"B\",\"last_name\":\"M\",\"username\":\"curl_b_$S\",\"email\":\"curl-b-$S@example.com\",\"password\":\"secret123\",\"unit_id\":$B_UNIT,\"manager_id\":$EMP}"
attack PATCH "/employees/$B_EMP" "{\"manager_id\":$EMP}"
attack POST /forms "{\"name\":\"B on A units\",\"type\":\"questionnaire\",\"submitter_type\":[\"employee\"],\"assigned_to_units\":[$UNIT],\"fields\":[{\"question\":\"Q\",\"type\":\"text\",\"order\":0}]}"
attack POST /assignments "{\"user_id\":$B_EMP,\"unit_id\":$UNIT}"
attack POST /keywords "{\"phrase\":\"b in a\",\"tenant_id\":\"$TENANT\"}"
attack POST /submissions/start "{\"form_id\":$FORM}"
attack GET "/organisations/$A_ORG"
attack GET "/tenants/$TENANT"
attack DELETE "/keywords/$KW"
attack DELETE "/assignments/$ASSIGN"
attack DELETE "/forms/$FORM"

echo "A afterwards"
for p in "/units/$UNIT?organisation_id=$A_ORG" "/assignments/$ASSIGN" "/keywords/$KW" "/forms/$FORM"; do
  out="$(call A GET "$p")"; printf '  %s GET %s  %s\n' "${out##*$'\n'}" "$p" "$(echo "${out%$'\n'*}" | head -c 90)"
done

[ "${KEEP:-}" = 1 ] || (cd "$API_DIR" && "$PY" scripts.py e2e:isolation --remove >/dev/null)
rm -rf "$JAR"
echo "$findings finding(s) in $checks checks"
[ "$findings" = 0 ]
