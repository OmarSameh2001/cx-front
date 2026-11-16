#!/usr/bin/env bash
# E1.1–E1.3 end to end with plain curl, against the real storage (Supabase),
# Redis and database: uploads straight to storage, limits at every layer,
# replace / rename / delete, image compression, file answers (employee and
# public), the logo, isolation, the cron tick, and the Redis rate limit.
#
#   cx-api must be running (python scripts.py dev) on $API (default :8000),
#   with S3_*, REDIS_URL and JOBS_CRON_SECRET set in cx-api/.env.
#   Usage: bash e2e/files-curl.sh        (KEEP=1 keeps the fixture)
set -u
API="${API:-http://localhost:8000}"
HERE="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$HERE/../../cx-api"
PY="${E2E_API_PYTHON:-$API_DIR/venv/Scripts/python.exe}"
[ -x "$PY" ] || PY="$API_DIR/venv/bin/python"
TMP="$(mktemp -d)"
PYTMP="$(cygpath -m "$TMP" 2>/dev/null || echo "$TMP")"   # the path as Python on Windows sees it
PASSWORD='Password123!'
CRON="$(grep -E '^JOBS_CRON_SECRET=' "$API_DIR/.env" | tail -1 | cut -d= -f2-)"
fails=0; checks=0

js() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log($1)"; }
login() { curl -s -o /dev/null -w "%{http_code}" -c "$TMP/$1" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$2\",\"password\":\"$PASSWORD\"}" "$API/auth/employee/login"; }
# call JAR METHOD PATH [JSON] -> sets $CODE and $BODY
call() {
  local jar="$1" method="$2" path="$3"; shift 3
  local args=(-s -X "$method" -w $'\n%{http_code}' "$API$path")
  [ "$jar" != - ] && args+=(-b "$TMP/$jar")
  [ $# -ge 1 ] && args+=(-H 'Content-Type: application/json' -d "$1")
  local out; out="$(curl "${args[@]}")"
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
expect() { # expect CODE LABEL
  checks=$((checks+1))
  if [ "$CODE" = "$1" ]; then printf '  ok    %s %s\n' "$CODE" "$2"
  else fails=$((fails+1)); printf '  FAIL  %s (wanted %s) %s :: %s\n' "$CODE" "$1" "$2" "$(echo "$BODY" | head -c 200)"; fi
}
truthy() { # truthy "JS expression on d" LABEL
  checks=$((checks+1))
  if [ "$(echo "$BODY" | js "!!($1)")" = true ]; then printf '  ok    %s\n' "$2"
  else fails=$((fails+1)); printf '  FAIL  %s :: %s\n' "$2" "$(echo "$BODY" | head -c 300)"; fi
}
same() { # same ACTUAL WANTED LABEL
  checks=$((checks+1))
  if [ "$1" = "$2" ]; then printf '  ok    %s\n' "$3"
  else fails=$((fails+1)); printf '  FAIL  %s: got %s, wanted %s\n' "$3" "$1" "$2"; fi
}
# put_to_storage UPLOAD_JSON FILE -> http code of the direct upload
put_to_storage() {
  local url ctype
  url="$(echo "$1" | js d.upload.url)"; ctype="$(echo "$1" | js "d.upload.headers['Content-Type']")"
  curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: $ctype" --data-binary "@$2" "$url"
}
# run every job now: forget when each last ran (jobs claim a Redis key per
# interval), then call the cron tick with its secret
tick() {
  (cd "$API_DIR" && "$PY" -c "
from common.services.redis_client import get_redis, key
r = get_redis()
for k in r.scan_iter(key('jobs', 'due', '*')): r.delete(k)")
  local out; out="$(curl -s -X POST -H "Authorization: Bearer $CRON" -w $'\n%{http_code}' "$API/internal/jobs/tick")"
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}

# tick until the relay has nothing left (earlier runs can leave a backlog,
# and one tick only relays for EVENTS_RELAY_MAX_SECONDS)
drain() {
  local i left
  for i in $(seq 1 15); do
    tick
    left=$(echo "$BODY" | js "(r=>r?r.result.done+r.result.retrying:0)(d.ran.find(r=>r.name==='events.relay'))")
    [ "$left" = 0 ] && return 0
  done
}

# --- test files ---
printf '%%PDF-1.4 e2e report one\n' > "$TMP/one.pdf"
printf '%%PDF-1.4 e2e report two, replaced\n' > "$TMP/two.pdf"
head -c 1572864 /dev/zero > "$TMP/big.pdf"   # 1.5 MB
"$PY" - "$TMP" <<'PYEOF'
import sys
from io import BytesIO
from PIL import Image
tmp = sys.argv[1]
img = Image.new("RGB", (4000, 3000), (120, 160, 200))
for x in range(0, 4000, 40):
    img.paste((x % 255, 90, 50), (x, 0, x + 12, 3000))
exif = Image.Exif(); exif[0x0112] = 6; exif[0x8825] = {1: "N", 2: (30.0, 2.0, 40.0)}
img.save(f"{tmp}/photo.jpg", "JPEG", quality=92, exif=exif)
Image.new("RGBA", (900, 900), (200, 30, 30, 255)).save(f"{tmp}/logo.png", "PNG")
PYEOF
PHOTO_SIZE=$(wc -c < "$TMP/photo.jpg"); LOGO_SIZE=$(wc -c < "$TMP/logo.png")

FAILED_BEFORE=$( (cd "$API_DIR" && "$PY" -c "
from sqlalchemy import text; from db import engine
with engine.connect() as c: print(c.execute(text('select count(*) from failed_jobs')).scalar())"))

echo "fixture"
FX="$(cd "$API_DIR" && "$PY" scripts.py e2e:isolation | tail -1)"
A_ORG=$(echo "$FX" | js d.A.org_id); B_ORG=$(echo "$FX" | js d.B.org_id)
echo "  A org $A_ORG, B org $B_ORG"
[ "$(login A isolation-a@example.com)" = 200 ] || { echo "login A failed"; exit 2; }
[ "$(login B isolation-b@example.com)" = 200 ] || { echo "login B failed"; exit 2; }
[ "$(login P platform@acme.com)" = 200 ] || { echo "login platform failed"; exit 2; }

echo "draining any earlier outbox backlog"
drain

echo "form with two file questions"
S=$(date +%s)
call A POST /forms "{\"name\":\"E2E files $S\",\"type\":\"questionnaire\",\"submitter_type\":[\"employee\",\"customer\"],\"fields\":[
  {\"question\":\"Your report (PDF, max 1 MB)\",\"type\":\"file\",\"order\":0,\"options\":[\"max_mb=1\",\"types=application/pdf\"]},
  {\"question\":\"A photo\",\"type\":\"file\",\"order\":1}]}"
expect 201 "create form"
FORM=$(echo "$BODY" | js d.id); TOKEN=$(echo "$BODY" | js d.public_token)
DOC_Q=$(echo "$BODY" | js "d.fields.find(f=>f.order===0).id"); PHOTO_Q=$(echo "$BODY" | js "d.fields.find(f=>f.order===1).id")
call A POST "/forms/$FORM/activate"; expect 200 "activate form"

echo "limits"
call A GET /files/limits/form_answer; expect 200 "effective limits"
truthy "d.max_mb===10 && d.image.max_side===1600 && d.hard_max_mb===50" "code defaults: 10 MB, 1600 px, hard cap 50"
call A PUT "/files/limits/form_answer?scope=platform" '{"max_mb":20}'; expect 403 "org admin can't set the platform default"
call P PUT "/files/limits/form_answer?scope=platform" '{"max_mb":20,"image":{"quality":75}}'; expect 200 "platform admin sets the default"
call A PUT /files/limits/form_answer '{"max_mb":5,"allowed_types":["application/pdf","image/*"]}'; expect 200 "org admin tightens for the org"
call A GET /files/limits/form_answer
truthy "d.max_mb===5 && d.image.quality===75 && d.platform.max_mb===20 && d.organisation.max_mb===5" "layers: platform 20 → org 5, quality from platform"
call B GET /files/limits/form_answer
truthy "d.max_mb===20 && !d.organisation" "org B gets the platform default, not A's"
call P PUT "/files/limits/form_answer?scope=platform" '{"max_mb":60}'; expect 422 "nothing above the hard cap"
call A GET "/files/limits/question?form_id=$FORM&field_id=$DOC_Q"; expect 200 "a question's limits (staff)"
truthy "d.max_mb===1 && d.allowed_types.length===1 && d.allowed_types[0]==='application/pdf' && !d.platform" "question tightens to 1 MB, PDF only"
call - GET "/public/forms/$TOKEN/fields/$DOC_Q/limits"; expect 200 "a question's limits (public link, no login)"
truthy "d.max_mb===1 && d.image.max_side===1600" "public sees the same limits and image policy"
call B GET "/files/limits/question?form_id=$FORM&field_id=$DOC_Q"; expect 404 "B can't read A's question limits"
call P POST /files/uploads "{\"purpose\":\"org_logo\",\"name\":\"logo.png\",\"content_type\":\"image/png\",\"size\":$LOGO_SIZE,\"organisation_id\":$B_ORG}"
expect 201 "platform admin starts a logo upload for another organisation"
UPL="$BODY"; PLOGO=$(echo "$UPL" | js d.file.id); put_to_storage "$UPL" "$TMP/logo.png" >/dev/null
call P POST "/files/$PLOGO/complete"; expect 200 "platform admin completes it"
call B GET "/files/$PLOGO"; expect 200 "the logo belongs to B's organisation"
call A POST /files/uploads "{\"purpose\":\"org_logo\",\"name\":\"logo.png\",\"content_type\":\"image/png\",\"size\":$LOGO_SIZE,\"organisation_id\":$B_ORG}"
expect 201 "an org admin's organisation_id is ignored"
UOL="$BODY"; OLOGO=$(echo "$UOL" | js d.file.id); put_to_storage "$UOL" "$TMP/logo.png" >/dev/null
call A POST "/files/$OLOGO/complete"; expect 200 "complete"
call B GET "/files/$OLOGO"; expect 404 "…the logo stays in A's organisation, not B's"
call A GET "/files/$OLOGO"; expect 200 "…and A can see it"

echo "upload, complete, download"
up() { call A POST /files/uploads "{\"purpose\":\"form_answer\",\"name\":\"$1\",\"content_type\":\"$2\",\"size\":$3,\"form_id\":$FORM,\"field_id\":$4}"; }
up big.pdf application/pdf 1572864 "$DOC_Q"; expect 413 "question limit (1 MB) refuses 1.5 MB"
up x.png image/png 100 "$DOC_Q"; expect 415 "question allows PDF only"
up evil.svg image/svg+xml 100 "$PHOTO_Q"; expect 415 "SVG never allowed"
up page.html text/html 100 "$PHOTO_Q"; expect 415 "HTML never allowed"
up one.pdf application/pdf "$(wc -c < "$TMP/one.pdf")" "$DOC_Q"; expect 201 "start upload"
U1="$BODY"; F1=$(echo "$U1" | js d.file.id)
truthy "d.upload.method==='PUT' && d.upload.url.includes('supabase.co') && d.file.status==='pending'" "signed target points at Supabase"
call A POST "/files/$F1/complete"; expect 409 "complete before the bytes arrive"
same "$(put_to_storage "$U1" "$TMP/one.pdf")" 200 "bytes go straight to storage"
call A POST "/files/$F1/complete"; expect 200 "complete"
truthy "d.status==='ready' && d.processing==='none'" "ready (PDF: no image processing)"
call A POST "/files/$F1/complete"; expect 200 "complete again is harmless"
call A GET "/files/$F1/link"; expect 200 "download link"
LINK=$(echo "$BODY" | js d.url)
same "$(curl -s "$LINK")" "$(cat "$TMP/one.pdf")" "download returns the uploaded bytes"
same "$(curl -s -D - -o /dev/null "$LINK" | grep -ic 'content-disposition: attachment')" 1 "downloads as an attachment"

echo "declared small, uploaded big"
up lie.pdf application/pdf 100 "$PHOTO_Q"; ULIE="$BODY"; FLIE=$(echo "$ULIE" | js d.file.id)
put_to_storage "$ULIE" "$TMP/big.pdf" >/dev/null
call A POST "/files/$FLIE/complete"; expect 200 "1.5 MB is within the 5 MB org limit"
call A PUT /files/limits/form_answer '{"max_mb":1}'
up lie2.pdf application/pdf 100 "$PHOTO_Q"; ULIE="$BODY"; FLIE2=$(echo "$ULIE" | js d.file.id)
put_to_storage "$ULIE" "$TMP/big.pdf" >/dev/null
call A POST "/files/$FLIE2/complete"; expect 413 "real size checked at complete (org limit now 1 MB)"
call A GET "/files/$FLIE2"; expect 404 "the refused file is gone"
call A PUT /files/limits/form_answer '{"max_mb":5,"allowed_types":["application/pdf","image/*"]}'

echo "replace, rename"
call A PUT "/files/$F1/content" "{\"name\":\"two.pdf\",\"content_type\":\"application/pdf\",\"size\":$(wc -c < "$TMP/two.pdf")}"
expect 200 "start replacing"
same "$(put_to_storage "$BODY" "$TMP/two.pdf")" 200 "new bytes uploaded"
call A GET "/files/$F1/link"; same "$(curl -s "$(echo "$BODY" | js d.url)")" "$(cat "$TMP/one.pdf")" "old content still served until complete"
call A POST "/files/$F1/complete"; expect 200 "complete the replacement"
truthy "d.id===$F1 && d.name==='two.pdf'" "same id, new name"
call A GET "/files/$F1/link"; same "$(curl -s "$(echo "$BODY" | js d.url)")" "$(cat "$TMP/two.pdf")" "new content served"
call A PATCH "/files/$F1" '{"name":"Quarterly report.pdf"}'; expect 200 "rename"
truthy "d.name==='Quarterly report.pdf'" "renamed"

echo "image compression"
up photo.jpg image/jpeg "$PHOTO_SIZE" "$PHOTO_Q"; UP="$BODY"; FP=$(echo "$UP" | js d.file.id)
truthy "d.image.max_side===1600 && d.image.format==='webp' && d.image.quality===75" "browser told how to compress (quality from platform)"
same "$(put_to_storage "$UP" "$TMP/photo.jpg")" 200 "photo uploaded ($PHOTO_SIZE bytes)"
call A POST "/files/$FP/complete"; expect 200 "complete photo"
truthy "d.processing==='pending'" "queued for processing"
tick; expect 200 "cron tick runs the relay"
truthy "d.ran.some(r=>r.name==='events.relay' && r.ok)" "relay ran"
drain
call A GET "/files/$FP"
truthy "d.processing==='done' && d.content_type==='image/webp' && d.name==='photo.webp' && d.has_thumbnail" "compressed to WebP with a thumbnail"
truthy "Math.max(d.width,d.height)===1600 && d.height>d.width" "1600 px, rotated upright"
NEW_SIZE=$(echo "$BODY" | js d.size)
truthy "$NEW_SIZE * 4 < $PHOTO_SIZE" "at least 4x smaller ($PHOTO_SIZE → $NEW_SIZE bytes)"
call A GET "/files/$FP/link?inline=true"; curl -s -o "$TMP/out.webp" "$(echo "$BODY" | js d.url)"
same "$("$PY" -c "from PIL import Image;i=Image.open(r'$PYTMP/out.webp');print(i.format, bool(i.getexif()), 'exif' in i.info)")" "WEBP False False" "stored image has no EXIF / GPS"
call A GET "/files/$FP/link?variant=thumb"; expect 200 "thumbnail link"
curl -s -o "$TMP/thumb.webp" "$(echo "$BODY" | js d.url)"
same "$("$PY" -c "from PIL import Image;print(max(Image.open(r'$PYTMP/thumb.webp').size))")" 320 "thumbnail is 320 px"

echo "employee answers with files"
call A POST /submissions/start "{\"form_id\":$FORM}"; expect 201 "start a submission"
SUB=$(echo "$BODY" | js d.id)
call A PATCH "/submissions/$SUB/draft" "{\"answers\":{\"$DOC_Q\":{\"file_id\":$FLIE}}}"
expect 422 "file uploaded for another question is refused"
call A PATCH "/submissions/$SUB/draft" "{\"answers\":{\"$DOC_Q\":{\"file_id\":$F1},\"$PHOTO_Q\":{\"file_id\":$FP}}}"
expect 200 "draft with two files"
call A GET "/files/$F1"; truthy "d.attached_type==='submission' && d.attached_id===$SUB" "file attached to the draft"
call A PATCH "/submissions/$SUB/draft" "{\"answers\":{\"$PHOTO_Q\":{\"file_id\":$FLIE}}}"
expect 200 "draft swaps the photo answer"
call A GET "/files/$FP"; expect 404 "the replaced answer's file is deleted"
call A POST "/submissions/$SUB/submit" '{}'; expect 200 "submit"
call A GET "/submissions/$SUB/detail"; expect 200 "response detail"
truthy "JSON.stringify(d).includes('\"file_id\":$F1') && JSON.stringify(d).includes('Quarterly report.pdf')" "answer stores the file id and name"
call A DELETE "/files/$F1"; expect 409 "files of a finished response can't be deleted"
call A POST /submissions/start "{\"form_id\":$FORM}"; SUB2=$(echo "$BODY" | js d.id)
call A PATCH "/submissions/$SUB2/draft" "{\"answers\":{\"$DOC_Q\":{\"file_id\":$F1}}}"
expect 422 "a file can't answer two submissions"
call A DELETE "/submissions/$SUB2"

echo "public respondent"
pub() { call - POST "/public/forms/$TOKEN/uploads" "$1"; }
pub "{\"field_id\":$DOC_Q,\"name\":\"cv.pdf\",\"content_type\":\"application/pdf\",\"size\":$(wc -c < "$TMP/one.pdf")}"
expect 201 "anonymous upload start"
UPUB="$BODY"; FPUB=$(echo "$UPUB" | js d.file.id); FTOK=$(echo "$UPUB" | js d.file_token)
truthy "d.file_token && d.file_token.length>20" "gets a file token"
same "$(put_to_storage "$UPUB" "$TMP/one.pdf")" 200 "bytes to storage"
call - POST "/public/forms/$TOKEN/uploads/$FPUB/complete" '{"file_token":"wrong-token-wrong-token"}'; expect 404 "wrong token can't complete"
call - POST "/public/forms/$TOKEN/uploads/$FPUB/complete" "{\"file_token\":\"$FTOK\"}"; expect 200 "complete with its token"
CUST="{\"email\":\"e2e-files-$S@example.com\",\"first_name\":\"Ann\",\"last_name\":\"Lee\"}"
call - POST "/public/forms/$TOKEN/submit" "{\"customer\":$CUST,\"answers\":{\"$DOC_Q\":{\"file_id\":$FPUB}}}"
expect 422 "answer without the token is refused"
call - POST "/public/forms/$TOKEN/submit" "{\"customer\":$CUST,\"answers\":{\"$DOC_Q\":{\"file_id\":$FPUB,\"token\":\"$FTOK\"}}}"
expect 201 "public submit with the file"
PSUB=$(echo "$BODY" | js d.submission_id)
call A GET "/files/$FPUB/link"; expect 200 "staff (reviewer) can download the customer's file"
call A GET "/files?attached_type=submission&attached_id=$PSUB"; truthy "d.items.length===1 && d.items[0].id===$FPUB" "list a response's files"

echo "delete"
up temp.pdf application/pdf "$(wc -c < "$TMP/one.pdf")" "$DOC_Q"; UT="$BODY"; FT=$(echo "$UT" | js d.file.id)
put_to_storage "$UT" "$TMP/one.pdf" >/dev/null; call A POST "/files/$FT/complete"
call A GET "/files/$FT/link"; TLINK=$(echo "$BODY" | js d.url)
call A DELETE "/files/$FT"; expect 204 "delete"
call A GET "/files/$FT"; expect 404 "gone"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$TLINK")" != 200 ]; same $? 0 "stored bytes removed (old link no longer works)"

echo "organisation logo"
call A POST /files/uploads "{\"purpose\":\"org_logo\",\"name\":\"logo.png\",\"content_type\":\"image/png\",\"size\":$LOGO_SIZE}"
expect 201 "org admin starts a logo upload"; UL="$BODY"; FL=$(echo "$UL" | js d.file.id)
put_to_storage "$UL" "$TMP/logo.png" >/dev/null; call A POST "/files/$FL/complete"; expect 200 "logo uploaded"
call A PATCH "/organisations/$A_ORG" "{\"logo_file_id\":$FL}"; expect 200 "set as the organisation logo"
drain
call A GET "/organisations/$A_ORG"; expect 200 "read organisation"
truthy "d.logo_file_id===$FL && d.logo.includes('supabase.co') && d.logo_thumb" "logo and thumbnail are signed links"
same "$(curl -s -o "$TMP/logo-out" -w '%{http_code}' "$(echo "$BODY" | js d.logo)")" 200 "logo link works"
same "$("$PY" -c "from PIL import Image;i=Image.open(r'$PYTMP/logo-out');print(i.format, max(i.size))")" "WEBP 512" "logo stored as 512 px WebP"
call B PATCH "/organisations/$A_ORG" "{\"logo_file_id\":$FL}"; [ "$CODE" = 403 ] || [ "$CODE" = 404 ]; same $? 0 "B can't touch A's logo"

echo "isolation (B against A's files)"
for p in "GET /files/$F1" "GET /files/$F1/link" "POST /files/$F1/complete" "PATCH /files/$FPUB" "DELETE /files/$FL" "GET /files/$FL/link"; do
  set -- $p
  if [ "$1" = GET ]; then call B "$1" "$2"; else call B "$1" "$2" '{"name":"hacked"}'; fi
  expect 404 "B: $p"
done
call B GET /files; truthy "!d.items.some(i=>[$F1,$FPUB,$FL].includes(i.id))" "B's list has none of A's files"
call B POST /files/uploads "{\"purpose\":\"form_answer\",\"name\":\"a.pdf\",\"content_type\":\"application/pdf\",\"size\":10,\"form_id\":$FORM,\"field_id\":$DOC_Q}"
expect 404 "B can't upload to A's form"

echo "jobs and cleanup"
call - POST /internal/jobs/tick; expect 401 "tick without the secret"
tick; expect 200 "tick with the secret"
truthy "['files.cleanup','events.relay','submissions.expire_abandoned_attempts'].every(n=>d.ran.some(r=>r.name===n && r.ok))" "cleanup, relay and expiry sweep all ran"
LEFT=$(cd "$API_DIR" && "$PY" -c "
from sqlalchemy import text; from db import engine
with engine.connect() as c: print(c.execute(text(\"select count(*) from files where organisation_id=$A_ORG and status='deleted'\")).scalar())")
same "$LEFT" 0 "cleanup removed every deleted file and its bytes"
same "$( (cd "$API_DIR" && "$PY" -c "
from sqlalchemy import text; from db import engine
with engine.connect() as c: print(c.execute(text('select count(*) from failed_jobs')).scalar())"))" "$FAILED_BEFORE" "no new failed jobs"

echo "rate limit (Redis)"
codes=""
for i in $(seq 1 22); do
  pub "{\"field_id\":$DOC_Q,\"name\":\"r$i.pdf\",\"content_type\":\"application/pdf\",\"size\":10}"; codes="$codes $CODE"
done
first=$(echo "$codes" | awk '{print $1}'); limited=$(echo "$codes" | tr ' ' '\n' | grep -c 429)
same "$first" 201 "uploads within the limit pass"
[ "$limited" -ge 2 ]; same $? 0 "past 20 a minute per IP: $limited got 429"

# cleanup: limits back to defaults, form archived, fixture (and its stored files) removed
call P DELETE "/files/limits/form_answer?scope=platform"
call A DELETE /files/limits/form_answer
call A POST "/forms/$FORM/deactivate"; call A DELETE "/forms/$FORM/public-token"
[ "${KEEP:-}" = 1 ] || (cd "$API_DIR" && "$PY" scripts.py e2e:isolation --remove >/dev/null)
rm -rf "$TMP"
echo "$fails failure(s) in $checks checks"
[ "$fails" = 0 ]
