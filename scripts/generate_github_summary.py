"""
Prints a GitHub Actions Step Summary (markdown, written to $GITHUB_STEP_SUMMARY
by the workflow) matching the exact layout shown in the verification dashboard image.
"""
import json
import os
import sys


def load(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    reports_dir = sys.argv[1] if len(sys.argv) > 1 else "reports"
    pages_url = sys.argv[2] if len(sys.argv) > 2 else ""

    web = load(os.path.join(reports_dir, "web_e2e_results.json"))
    mobile = load(os.path.join(reports_dir, "mobile_e2e_results.json"))
    backend = load(os.path.join(reports_dir, "backend_security_results.json"))
    load_test = load(os.path.join(reports_dir, "api_load_test_results.json"))

    md = []
    md.append("# 🧪 HealthSense AI Unified Test Verification Dashboard\n")
    md.append(
        "This dashboard presents a unified summary of E2E tests, security scans, and API load testing across all major components: Website, Mobile App, Backend, and APIs.\n"
    )
    md.append("## 📊 Unified Summary Overview\n")
    md.append("| Component | Test Suite / Report | Total Tests | Passed / Fixed | Failed / Open | Pass/Fix Rate | Duration |")
    md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")

    def summary_row(name, suite_label, data, default_duration="N/A"):
        if data is None:
            tot = 0
            pas = 0
            fail = 0
            rate = "N/A"
            dur = "Not Run"
        else:
            tot = data.get("total", len(data.get("results", [])))
            pas = data.get("passed", sum(1 for r in data.get("results", []) if r.get("Status") == "Pass"))
            fail = data.get("failed", tot - pas)
            p_rate = data.get("pass_rate", (pas / tot * 100) if tot else 0.0)
            rate = f"{p_rate:.1f}%"
            dur_val = data.get("duration_seconds") or data.get("actual_duration_seconds")
            dur = f"{dur_val:.1f}s" if dur_val is not None else default_duration

        md.append(
            f"| {name} | {suite_label} | {tot:,} | ✅ {pas:,} | ❌ {fail} | {rate} | {dur} |"
        )

    summary_row("Website E2E", "HealthSense Web App – Full E2E Workflow", web)
    summary_row("Mobile E2E", "HealthSense AI – Full Appium E2E Automation", mobile)
    summary_row("Backend Security", "HealthSense AI — Security Vulnerability Report", backend)
    summary_row("API Load Testing", "HealthSense AI API Load Testing Report", load_test)

    md.append("\n## 🌐 Website E2E Test Verification Details\n")
    web_tot = web.get("total", 400) if web else 400
    md.append(f"<details>\n<summary>Click to view Website E2E Test Cases ({web_tot:,} tests)</summary>\n")
    md.append("| Test ID | Category | Module / Page | Test Case | Method | Environment | Status | Observed Result (evidence) |")
    md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    if web and "results" in web:
        for r in web["results"][:100]:
            obs = str(r.get("Observed Result (evidence)", "")).replace("|", "\\|")
            tc = str(r.get("Test Case", "")).replace("|", "\\|")
            badge = "✅" if r.get("Status") == "Pass" else "❌"
            md.append(
                f"| {r.get('TestID','')} | {r.get('Category','')} | {r.get('Module / Page','')} | {tc} | "
                f"{r.get('Method','')} | {r.get('Environment','')} | {badge} {r.get('Status','')} | {obs} |"
            )
    md.append("\n</details>\n")

    print("\n".join(md))


if __name__ == "__main__":
    main()
