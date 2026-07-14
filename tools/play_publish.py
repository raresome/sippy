#!/usr/bin/env python3
"""Push SIPPY's store listing + a signed AAB to Google Play via the Android Publisher API.

Usage:
    python tools/play_publish.py              # dry run: build the edit, validate, discard
    python tools/play_publish.py --commit     # actually apply it
    python tools/play_publish.py --commit --status completed   # roll out instead of draft

What it does, in one atomic edit:
  1. uploads android/app/build/outputs/bundle/release/app-release.aab
  2. writes the en-US listing from store-assets/text/
  3. uploads the icon, feature graphic and every screenshot from store-assets/
  4. puts the new versionCode on the closed-testing track as a DRAFT release
  5. validates, then commits

WHAT THIS SCRIPT CANNOT DO — and no script can:
The Play Developer API has **no endpoint for the "App content" section**. Confirmed against the v3
discovery doc: `edits` exposes only apks, bundles, countryavailability, deobfuscationfiles, details,
expansionfiles, images, listings, testers, tracks. So the content-rating questionnaire, data safety
form, target audience, ads declaration, app access, and the privacy-policy URL field are all
**web-UI only**, as are country selection and tester email lists (edits.testers takes Google Groups
only). A new app cannot pass review with those blank, so the release stays a draft until a human
completes them in the Console and presses "Send for review".

Prereqs: `pip install google-auth`; the service-account JSON below must be granted release access
in Play Console (Users and permissions).

Re-running: bump `versionCode` in android/app/build.gradle and rebuild first. Play rejects a
second upload of a version code it has already seen, so a re-run against an unchanged build will
fail at the bundle step (harmless — the edit is discarded, nothing is committed).

GOTCHA worth keeping: listing images live at `edits/{id}/listings/{lang}/{imageType}` — there is
NO `/images/` path, despite the resource being called `edits.images`. Valid imageType values:
icon | featureGraphic | phoneScreenshots | sevenInchScreenshots | tenInchScreenshots |
tvScreenshots | tvBanner | wearScreenshots.
"""
import glob
import json
import os
import sys
import urllib.error
import urllib.request

from google.auth.transport.requests import Request
from google.oauth2 import service_account

SA_JSON = os.environ.get(
    "PLAY_SA_JSON",
    r"C:\My_Apps\_credentials\Google_Play_Android_Developer_API"
    r"\graceful-karma-502020-u1-d5c4b22cc31b.json",
)
PKG = "com.genartstudios.sippy"
LANG = "en-US"
TRACK = "alpha"  # Play calls this "Closed testing" in the UI

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AAB = os.path.join(ROOT, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab")
TXT = os.path.join(ROOT, "store-assets", "text")
GFX = os.path.join(ROOT, "store-assets", "graphics")
SHOTS = os.path.join(ROOT, "store-assets", "screenshots")

# Play's hard limits. Checked up front so a long upload can't die on an opaque 400.
LIMITS = {"title": 30, "short": 80, "full": 4000, "notes": 500}

API = "https://androidpublisher.googleapis.com/androidpublisher/v3"
UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"

commit = "--commit" in sys.argv
status = "completed" if "completed" in sys.argv else "draft"

creds = service_account.Credentials.from_service_account_file(
    SA_JSON, scopes=["https://www.googleapis.com/auth/androidpublisher"]
)
creds.refresh(Request())


def call(method, url, body=None, blob=None, ctype="application/octet-stream"):
    if blob is not None:
        data, header = blob, ctype
    else:
        data = json.dumps(body).encode() if body is not None else None
        header = "application/json"
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + creds.token)
    if data is not None:
        req.add_header("Content-Type", header)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"\n!! {method} {url}\n!! HTTP {e.code}\n{e.read().decode()}")


def read(name):
    with open(os.path.join(TXT, name), encoding="utf-8") as f:
        return f.read().strip()


text = {
    "title": read("title.txt"),
    "short": read("short-description.txt"),
    "full": read("full-description.txt"),
    "notes": read("whats-new.txt"),
}
for key, limit in LIMITS.items():
    n = len(text[key])
    if n > limit:
        raise SystemExit(f"{key} is {n} chars, over Play's {limit} limit")
    print(f"  {key:<7} {n:>4} / {limit} chars  OK")

edit_id = call("POST", f"{API}/applications/{PKG}/edits")["id"]
E = f"{API}/applications/{PKG}/edits/{edit_id}"
EU = f"{UPLOAD}/applications/{PKG}/edits/{edit_id}"
print(f"\nedit {edit_id}")

with open(AAB, "rb") as f:
    aab = f.read()
print(f"\nuploading AAB ({len(aab) / 1e6:.1f} MB)...")
bundle = call("POST", f"{EU}/bundles?uploadType=media", blob=aab)
version_code = bundle["versionCode"]
print(f"  -> versionCode {version_code}  sha1 {bundle.get('sha1', '?')[:16]}...")

call(
    "PUT",
    f"{E}/listings/{LANG}",
    body={
        "language": LANG,
        "title": text["title"],
        "shortDescription": text["short"],
        "fullDescription": text["full"],
    },
)
print(f"\nlisting written ({LANG}): {text['title']!r}")


def put_image(image_type, path):
    with open(path, "rb") as f:
        call("POST", f"{EU}/listings/{LANG}/{image_type}?uploadType=media",
             blob=f.read(), ctype="image/png")
    print(f"  + {image_type:<18} {os.path.basename(path)}")


print("\ngraphics:")
for image_type in ("icon", "featureGraphic", "phoneScreenshots"):
    call("DELETE", f"{E}/listings/{LANG}/{image_type}")  # clear first so re-runs don't stack up
put_image("icon", os.path.join(GFX, "icon-512.png"))
put_image("featureGraphic", os.path.join(GFX, "feature-graphic.png"))
for shot in sorted(glob.glob(os.path.join(SHOTS, "*.png"))):
    put_image("phoneScreenshots", shot)

call(
    "PUT",
    f"{E}/tracks/{TRACK}",
    body={
        "track": TRACK,
        "releases": [{
            "name": f"1.0 ({version_code}) - Closed test",
            "versionCodes": [str(version_code)],
            "status": status,
            "releaseNotes": [{"language": LANG, "text": text["notes"]}],
        }],
    },
)
print(f"\ntrack '{TRACK}' -> {status.upper()} release, versionCode {version_code}")

call("POST", f"{E}:validate")
print("\nvalidate: PASSED")

if not commit:
    call("DELETE", E)
    raise SystemExit("dry run -- edit discarded. Re-run with --commit to apply.")

call("POST", f"{E}:commit")
print(f"COMMITTED. versionCode {version_code} is on '{TRACK}' as {status}.")
if status == "draft":
    print("Nothing was sent to Google. Finish App content in the Console, then Send for review.")
