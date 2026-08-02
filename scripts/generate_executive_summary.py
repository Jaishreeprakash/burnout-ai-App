"""
Aggregates real findings from the backend security suite plus the real
Semgrep/Trivy/Gitleaks scanner outputs (when those steps have run) into
executive-summary.md with a computed security score.

Only counts things that actually happened: a CWE/OWASP-tagged backend
scenario only becomes a "finding" if its real Status is Fail (meaning the
attack actually succeeded against the live backend, not that it was merely
attempted). Scanner sections read each tool's real JSON output if present;
if a tool didn't run, that section says so plainly rather than reporting 0
findings as if it had.
"""
import json
import os
import sys
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SEVERITY_BY_CWE_PREFIX = {
    "CWE-89": "Critical",   # SQL Injection
    "CWE-306": "Critical",  # Missing Authentication
    "CWE-287": "Critical",  # Improper Authentication
    "CWE-79": "High",       # XSS
    "CWE-93": "High",       # CRLF Injection
    "CWE-613": "Medium",    # Insufficient Session Expiration
    "CWE-942": "Medium",    # Overly Permissive CORS
    "CWE-915": "Medium",    # Mass Assignment
    "CWE-620": "Medium",    # Unverified Password Change
    "CWE-1284": "Low",      # Oversized input handling
    "CWE-436": "Low",       # Interpretation Conflict
}
SCORE_DEDUCTION = {"Critical": 20, "High": 10, "Medium": 5, "Low": 1}


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return None


def backend_findings(reports_dir):
    data = load_json(os.path.join(reports_dir, "backend_security_results.json"))
    findings = []
    if not data:
        return findings, False
    for r in data["results"]:
        cwe = r.get("CWE", "")
        if not cwe or r.get("Status") != "Fail":
            continue
        cwe_id = cwe.split(":")[0].strip()
        severity = SEVERITY_BY_CWE_PREFIX.get(cwe_id, "Medium")
        findings.append({
            "source": "Backend & Security suite (live, real HTTP)",
            "severity": severity, "cwe": cwe, "owasp": r.get("OWASP", ""),
            "title": r.get("Test Case", ""), "evidence": r.get("Observed Result (evidence)", ""),
        })
    return findings, True


def _join_metadata_field(value):
    """Semgrep's metadata.cwe/.owasp fields are inconsistently a plain string
    for a single value or a list for multiple — confirmed on real output
    where the same run produced both shapes across different rules."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return ", ".join(str(v) for v in value)


def semgrep_findings(reports_dir):
    data = load_json(os.path.join(reports_dir, "semgrep-results.json"))
    if data is None:
        return [], False
    sev_map = {"ERROR": "High", "WARNING": "Medium", "INFO": "Low"}
    findings = []
    for r in data.get("results", []):
        sev = sev_map.get(r.get("extra", {}).get("severity", "WARNING"), "Medium")
        metadata = r.get("extra", {}).get("metadata", {})
        findings.append({
            "source": "Semgrep (SAST)", "severity": sev,
            "cwe": _join_metadata_field(metadata.get("cwe")),
            "owasp": _join_metadata_field(metadata.get("owasp")),
            "title": r.get("check_id", ""), "evidence": f"{r.get('path','')}:{r.get('start',{}).get('line','')}",
        })
    return findings, True


def trivy_findings(reports_dir):
    data = load_json(os.path.join(reports_dir, "trivy-results.json"))
    if data is None:
        return [], False
    findings = []
    for result in data.get("Results", []) or []:
        for vuln in result.get("Vulnerabilities", []) or []:
            sev = (vuln.get("Severity") or "MEDIUM").title()
            if sev == "Unknown":
                sev = "Low"
            findings.append({
                "source": "Trivy (dependency scan)", "severity": sev,
                "cwe": "", "owasp": "A06:2021-Vulnerable and Outdated Components",
                "title": f"{vuln.get('PkgName','')} {vuln.get('InstalledVersion','')} — {vuln.get('VulnerabilityID','')}",
                "evidence": vuln.get("Title", ""),
            })
    return findings, True


def gitleaks_findings(reports_dir):
    data = load_json(os.path.join(reports_dir, "gitleaks-report.json"))
    if data is None:
        return [], False
    findings = []
    for leak in data if isinstance(data, list) else []:
        findings.append({
            "source": "Gitleaks (secret scan)", "severity": "Critical",
            "cwe": "CWE-798: Use of Hard-coded Credentials", "owasp": "A02:2021-Cryptographic Failures",
            "title": f"{leak.get('RuleID','')} in {leak.get('File','')}",
            "evidence": f"line {leak.get('StartLine','?')}",
        })
    return findings, True


def generate(reports_dir, output_path):
    all_findings = []
    ran = {}
    for name, fn in [("Backend & Security suite", backend_findings), ("Semgrep", semgrep_findings),
                      ("Trivy", trivy_findings), ("Gitleaks", gitleaks_findings)]:
        findings, did_run = fn(reports_dir)
        all_findings.extend(findings)
        ran[name] = did_run

    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for f in all_findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    score = 100
    for sev, n in counts.items():
        score -= SCORE_DEDUCTION[sev] * n
    score = max(0, score)

    if counts["Critical"] > 0:
        rating = "Critical"
    elif counts["High"] > 0:
        rating = "High"
    elif counts["Medium"] > 0:
        rating = "Medium"
    else:
        rating = "Low"

    md = ["# Executive Summary\n", f"Generated: {now_iso()}\n"]
    md.append("## Total Findings\n")
    md.append(f"- Critical: {counts['Critical']}")
    md.append(f"- High: {counts['High']}")
    md.append(f"- Medium: {counts['Medium']}")
    md.append(f"- Low: {counts['Low']}\n")

    md.append("## Scan Coverage\n")
    for name, did_run in ran.items():
        md.append(f"- {name}: {'ran' if did_run else 'NOT RUN — no output file found, not counted as zero findings'}")
    md.append("")

    top = sorted(all_findings, key=lambda f: list(SCORE_DEDUCTION.keys()).index(f["severity"]))[:10]
    md.append("## Top Risks\n")
    if top:
        for i, f in enumerate(top, 1):
            md.append(f"{i}. **[{f['severity']}]** {f['title']} — {f['source']}"
                       + (f" ({f['cwe']})" if f['cwe'] else "")
                       + (f" ({f['owasp']})" if f['owasp'] else ""))
    else:
        md.append("No findings from any scan that ran.")
    md.append("")

    md.append(f"## Overall Security Score\n\n**{score}/100**\n")
    md.append(f"## Risk Rating\n\n**{rating}**\n")

    if all_findings:
        md.append("## Finding Detail\n")
        md.append("| Severity | Source | Title | CWE | OWASP | Evidence |")
        md.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for f in all_findings:
            md.append(f"| {f['severity']} | {f['source']} | {f['title']} | {f['cwe']} | {f['owasp']} | {f['evidence']} |")

    os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None
    with open(output_path, "w", encoding="utf-8") as fp:
        fp.write("\n".join(md))
    return output_path, counts, score, rating


if __name__ == "__main__":
    reports_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO_ROOT, "reports")
    output_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REPO_ROOT, "reports", "executive-summary.md")
    path, counts, score, rating = generate(reports_dir, output_path)
    print(f"Generated {path}")
    print(f"Findings: {counts} | Score: {score}/100 | Rating: {rating}")
