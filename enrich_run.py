#!/usr/bin/env python3
"""Daily enrichment worker — patches pendingSuggestions + lastEnrichmentAt for eligible invitees."""

import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

BASE = "https://firestore.googleapis.com/v1/projects/gala-invite-list-2026/databases/(default)/documents"
TODAY_ISO = "2026-05-21T07:00:00Z"
TODAY_DT = datetime(2026, 5, 21, tzinfo=timezone.utc)
CUTOFF_DT = TODAY_DT - timedelta(days=7)  # 2026-05-14

# ── Manually-researched proposals ───────────────────────────────────────────────
PROPOSALS = {
    # Natalia Zea — Children's Trust Chief Public Policy & Community Engagement Officer
    "TZ0QltqQnA1kvA3ASGGt": {
        "title": "Chief Public Policy & Community Engagement Officer",
        "organization": "The Children's Trust of Miami-Dade County",
        "bio": (
            "Natalia Zea is the Chief Public Policy & Community Engagement Officer at The "
            "Children's Trust of Miami-Dade County, leading public policy and communications "
            "efforts. She has two decades of experience in government, journalism, and public "
            "affairs, including serving as Chief of Staff to a Miami-Dade County Commissioner. "
            "A former CBS Miami news anchor, she holds a journalism degree from the University "
            "of Colorado-Boulder and an executive MPA from FIU."
        ),
        "headshotUrl": "https://web.trustcentral.org/sites/Natalia_Zea_%202.jpg",
    },
    # Catherine Lopez — corrected title from "Principal" to "Assistant Principal of Curriculum"
    "jsPlSVkVm9kHlNkcoqxZ": {
        "title": "Assistant Principal of Curriculum",
        "bio": (
            "Catherine Lopez serves as Assistant Principal of Curriculum at Homestead Middle "
            "School in Miami-Dade County, overseeing instructional leadership and academic "
            "programs. She has dedicated her career to education within Miami-Dade County "
            "Public Schools, with a focus on curriculum development and student outcomes. Her "
            "work at Homestead Middle School supports the school community in the Homestead "
            "area of South Miami-Dade."
        ),
    },
}


def fetch_invitees():
    url = f"{BASE}/invitees?pageSize=500"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def get_str(fields, key):
    return fields.get(key, {}).get("stringValue", "").strip()


def get_bool(fields, key):
    return fields.get(key, {}).get("booleanValue", False)


def parse_dt(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def build_patch_body(proposal_map, last_enrichment_at):
    """Build Firestore PATCH body. proposal_map may be empty (timestamp-only)."""
    fields = {"lastEnrichmentAt": {"stringValue": last_enrichment_at}}
    if proposal_map:
        sugg_fields = {k: {"stringValue": v} for k, v in proposal_map.items()}
        fields["pendingSuggestions"] = {"mapValue": {"fields": sugg_fields}}
    return {"fields": fields}


def patch_invitee(doc_id, body, with_pending):
    url = f"{BASE}/invitees/{doc_id}"
    params = "?updateMask.fieldPaths=lastEnrichmentAt"
    if with_pending:
        params += "&updateMask.fieldPaths=pendingSuggestions"
    full_url = url + params
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        full_url,
        data=data,
        method="PATCH",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return doc_id, resp.status, None
    except urllib.error.HTTPError as e:
        return doc_id, e.code, e.read().decode("utf-8", errors="replace")
    except Exception as ex:
        return doc_id, None, str(ex)


def main():
    print("Fetching invitees from Firestore…")
    data = fetch_invitees()
    docs = data.get("documents", [])
    print(f"  Got {len(docs)} documents")

    excluded_fb = []
    has_pending = []
    too_recent = []
    eligible_ids = []      # (doc_id, name)
    no_real_name = []

    PLACEHOLDER_NAMES = {
        "", "DDA People", "Interlochen", "Grants People?",
        "Ebony", "Belissa - cc Lindsey", "Lisa Mozloom + media",
    }

    for doc in docs:
        fields = doc.get("fields", {})
        name = get_str(fields, "name")
        doc_id = doc["name"].split("/")[-1]
        excl = get_bool(fields, "excludeFromFacebook")
        pending_raw = fields.get("pendingSuggestions", {}).get("mapValue", {}).get("fields", {})
        pending_nonempty = {k: v for k, v in pending_raw.items()
                            if v.get("stringValue", "").strip()}
        last_str = get_str(fields, "lastEnrichmentAt")
        last_dt = parse_dt(last_str)

        if excl:
            excluded_fb.append(name or doc_id)
            continue
        if pending_nonempty:
            has_pending.append(name or doc_id)
            continue
        if last_dt and last_dt >= CUTOFF_DT:
            too_recent.append(name or doc_id)
            continue
        if name in PLACEHOLDER_NAMES:
            no_real_name.append(doc_id)
            continue

        eligible_ids.append((doc_id, name))

    print(f"\nSkip breakdown:")
    print(f"  excludeFromFacebook: {len(excluded_fb)}")
    print(f"  Has pending drafts:  {len(has_pending)}")
    print(f"  Enriched < 7 days:   {len(too_recent)}")
    print(f"  No real name:        {len(no_real_name)}")
    print(f"  Eligible:            {len(eligible_ids)}")

    # ── Patch all eligible invitees ──────────────────────────────────────────────
    tasks = []
    for doc_id, name in eligible_ids:
        proposal = PROPOSALS.get(doc_id, {})
        body = build_patch_body(proposal, TODAY_ISO)
        tasks.append((doc_id, name, body, bool(proposal)))

    print(f"\nPatching {len(tasks)} invitees (2 with proposals, {len(tasks)-2} timestamp-only)…")

    results = {"ok": [], "err": []}
    drafted = []  # (name, fields proposed)

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {
            pool.submit(patch_invitee, doc_id, body, with_pending): (doc_id, name, with_pending)
            for doc_id, name, body, with_pending in tasks
        }
        for fut in as_completed(futures):
            doc_id, name, with_pending = futures[fut]
            did, status, err = fut.result()
            if err or (status and status >= 300):
                results["err"].append((name, status, err))
                print(f"  ERROR {name}: {status} {err[:120] if err else ''}")
            else:
                results["ok"].append(name)
                if with_pending:
                    proposal_keys = list(PROPOSALS[doc_id].keys())
                    drafted.append((name, proposal_keys))

    print(f"\nPatch results: {len(results['ok'])} OK, {len(results['err'])} errors")

    return {
        "total": len(docs),
        "excluded_fb": len(excluded_fb),
        "has_pending": len(has_pending),
        "too_recent": len(too_recent),
        "no_real_name": len(no_real_name),
        "eligible": len(eligible_ids),
        "drafted": drafted,
        "errors": results["err"],
    }


if __name__ == "__main__":
    stats = main()
    print("\n=== FINAL STATS ===")
    print(json.dumps(stats, indent=2, default=str))
