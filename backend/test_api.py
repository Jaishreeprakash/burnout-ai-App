import urllib.request, json
from urllib.parse import urlencode

base = "http://192.168.31.10:8000/api/v1"

# Login
form_data = urlencode({"username": "demo2@burnout.com", "password": "Demo1234!"}).encode()
req = urllib.request.Request(
    base + "/auth/login",
    data=form_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST",
)
token = json.loads(urllib.request.urlopen(req).read())["access_token"]
H = {"Authorization": "Bearer " + token}
print("LOGIN OK")

# Dashboard
dash = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/wellness/dashboard", headers=H)).read())
print("\n=== DASHBOARD ===")
print("Burnout Score:", dash.get("current_burnout_score"))
print("Risk Level:   ", dash.get("risk_level"))
print("Wellness Score:", dash.get("wellness_score"))
print("Sleep Avg (h):", dash.get("sleep_avg_hours"))
print("Dominant Emotion:", dash.get("dominant_emotion"))

# Burnout analysis
burnout = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/burnout/analysis", headers=H)).read())
print("\n=== BURNOUT ANALYSIS ===")
print("Score:", burnout.get("burnout_score"))
print("Risk Level:", burnout.get("risk_level"))
print("Components:", burnout.get("component_scores"))

# Recommendations
recs = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/recommendations/", headers=H)).read())
print("\n=== RECOMMENDATIONS (" + str(len(recs)) + " total) ===")
for r in recs[:3]:
    print("[" + r["priority"].upper() + "] " + r["title"] + " (" + r["category"] + ")")

# Trends
trends = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/wellness/trends", headers=H)).read())
print("\n=== TRENDS ===")
print("7d burnout points:", len(trends.get("burnout_7d", [])))
print("30d burnout points:", len(trends.get("burnout_30d", [])))
trend_info = trends.get("trend", {})
print("Direction:", trend_info.get("direction"))

# Sleep history
sleep = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/tracking/sleep", headers=H)).read())
print("\n=== SLEEP HISTORY ===")
print("Records:", len(sleep))
if sleep:
    print("Latest:", sleep[0].get("duration_hours"), "hrs quality:", sleep[0].get("quality_score"))

print("\nAll endpoints verified successfully!")
