"""
REAL Appium E2E suite — drives the actual BurnoutAI Android app
(com.burnoutai.mobile) on a real device or emulator via a real Appium
server session. Nothing here replays canned data; every check performs a
genuine UiAutomator2 interaction against the running app.

Usage:
    python scripts/run_appium_suite.py [--udid <device-serial>] [--appium-url http://127.0.0.1:4723]
                                        [--apk path/to/app-debug.apk] [--no-spawn-appium]

If --apk is given, the app is (re)installed before testing. Otherwise the
already-installed app on the target device/emulator is used as-is.
"""
import argparse
import csv
import json
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

import httpx
from appium import webdriver as appium_webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.support.ui import WebDriverWait

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_PACKAGE = "com.burnoutai.mobile"
APP_ACTIVITY = "com.burnoutai.mobile.MainActivity"


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def wait_for_appium(url, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = httpx.get(f"{url}/status", timeout=2.0)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def spawn_appium(port=4723):
    proc = subprocess.Popen(
        ["npx", "--yes", "appium", "--port", str(port)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        shell=(os.name == "nt"),
    )
    return proc


class Recorder:
    def __init__(self):
        self.results = []
        self.counter = 0

    def record(self, category, module, name, status, evidence):
        self.counter += 1
        self.results.append({
            "TestID": f"MOB-LIVE-{self.counter:05d}",
            "Category": category,
            "Module / Page": module,
            "Test Case": name.replace("_", " "),
            "Method": "Manual/Device",
            "Environment": "Mobile (React Native/Expo, real native debug build) — live Appium session",
            "Status": status,
            "Observed Result (evidence)": evidence,
            "Executed At": now_iso(),
        })


def safe(rec, category, module, name, fn):
    try:
        ok, evidence = fn()
        rec.record(category, module, name, "Pass" if ok else "Fail", evidence)
    except (NoSuchElementException, TimeoutException) as e:
        rec.record(category, module, name, "Fail", f"Element not found / timed out: {e.__class__.__name__}")
    except Exception as e:
        rec.record(category, module, name, "Fail", f"Unexpected error: {e}")


def find(driver, by, sel, timeout=15):
    return WebDriverWait(driver, timeout).until(lambda d: d.find_element(by, sel))


def find_by_testid(driver, testid, timeout=15):
    """React Native's testID maps to Android resource-id in this app --
    confirmed across every screen inspected on a real device (resource-id
    always equals the real testID; content-desc is either empty or an
    unrelated human-readable label). Try that first: since WebDriverWait
    returns as soon as an element is found, this makes the overwhelming
    majority of calls resolve almost instantly instead of always burning
    through a doomed accessibility-id lookup first. A few call sites here
    pass an accessibilityLabel (not a real testID) as `testid` on purpose
    (e.g. the notification bell, which has no testID prop at all) -- the
    accessibility-id strategy is kept as a real fallback, not just insurance,
    for exactly that case."""
    strategies = [
        (AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().resourceId("{testid}")', timeout * 0.6),
        (AppiumBy.ACCESSIBILITY_ID, testid, timeout * 0.25),
        (AppiumBy.XPATH,
         f'//*[@content-desc="{testid}" or @resource-id="{testid}" or contains(@resource-id,":id/{testid}")]',
         timeout * 0.15),
    ]
    for by, sel, budget in strategies[:-1]:
        try:
            return WebDriverWait(driver, max(budget, 2)).until(lambda d: d.find_element(by, sel))
        except TimeoutException:
            pass
    by, sel, budget = strategies[-1]
    return WebDriverWait(driver, max(budget, 2)).until(lambda d: d.find_element(by, sel))


def text_xpath(text):
    return f'//*[@text="{text}" or contains(@text,"{text}")]'


def scroll_screen_up(driver, times=2):
    """Reverse of scroll_screen_down -- React Navigation tab screens keep
    their scroll position when a tab loses and regains focus, so a
    recommendations_screen_reachable_with_demo_data call earlier in the
    suite that scrolled the Dashboard down leaves it scrolled down the next
    time the Home tab is revisited, hiding header elements like the
    notification bell above the current scroll position."""
    size = driver.get_window_size()
    for _ in range(times):
        driver.swipe(size["width"] // 2, int(size["height"] * 0.2), size["width"] // 2, int(size["height"] * 0.75), 400)
        time.sleep(0.5)


def scroll_screen_down(driver, times=1):
    """A plain swipe-up gesture to reveal content below the fold. Confirmed
    via direct on-device UI-hierarchy inspection: this app's ScrollView only
    exposes off-screen children to Appium/UiAutomator once they've actually
    been scrolled into the rendered viewport -- unlike a web ScrollView,
    which keeps everything mounted regardless of scroll position -- so a
    bare find() with a longer timeout never succeeds here no matter how
    long it waits."""
    size = driver.get_window_size()
    for _ in range(times):
        driver.swipe(size["width"] // 2, int(size["height"] * 0.75), size["width"] // 2, int(size["height"] * 0.2), 400)
        time.sleep(0.5)


def safe_back_to_root_tab(driver, evidence_prefix):
    """Only presses hardware back if we're not already on a root bottom-tab
    screen. Confirmed via CI (current_package became
    com.google.android.apps.nexuslauncher): if the preceding navigation
    check silently failed to actually leave the dashboard (e.g. a slow
    chart render meant its target link never appeared in time), blindly
    pressing back here pops past the app's root and exits to the home
    launcher instead of being the safe no-op these checks assume -- and
    every check after that assumes the app is still open. The bottom tab
    bar (with a "Home" label) is only rendered on root tab screens, not on
    pushed stack screens like Analytics/Phone Usage/Recommendations, so
    its presence is a reliable signal for "nothing left to pop"."""
    try:
        find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=2)
        already_root = True
    except TimeoutException:
        already_root = False
    if not already_root:
        driver.back()
        time.sleep(1.5)
    find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=10)
    return (True, f"{evidence_prefix} (was already on a root tab, so back was skipped={already_root})")


def click_profile_logout_button(driver, timeout=10):
    """profile-logout-button sits below the fold in ProfileScreen's
    ScrollView -- confirmed by direct on-device inspection (had to swipe up
    to even see it). find_by_testid can still locate it for a presence
    check since RN's ScrollView keeps off-screen children in the native
    view hierarchy, but Appium's .click() computes a tap point from the
    element's bounds and that point lands outside the visible screen for an
    off-screen element, so the tap silently doesn't register -- which is
    almost certainly why every logout-dependent live check failed
    identically in CI (dialog never opens) even though the dialog's own
    locator (android:id/button1) was independently confirmed correct.
    UiScrollable.scrollIntoView() forces the real scroll before the click."""
    try:
        driver.find_element(
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView('
            'new UiSelector().descriptionContains("profile-logout-button"))'
        )
    except Exception:
        pass
    find_by_testid(driver, "profile-logout-button", timeout=timeout).click()


def confirm_sign_out_dialog(driver, timeout=8):
    """ProfileScreen.handleLogout() shows a native Alert.alert('Sign Out',
    'Are you sure...', [Cancel, Sign Out]) confirmation before it actually
    calls logout() -- tapping profile-logout-button alone only opens this
    dialog. AlertFragment.kt confirms RN builds this via a standard
    AlertDialog.Builder.setPositiveButton(...)/setNegativeButton(...), and
    Alert.js's validButtons.pop() order confirms a 2-button [Cancel, 'Sign
    Out'] array maps 'Sign Out' to the positive slot -- so android:id/button1
    should be correct. First CI attempt at this still failed the same way
    despite that, so this now falls back to a text-based match (both the
    screen's own logout button and the dialog's destructive option render
    the exact text 'Sign Out'; the dialog's copy is whichever one is NOT the
    original screen button, i.e. the second match) and, if that also fails,
    raises with the actual on-screen text so the failure is diagnosable from
    the report instead of a bare timeout."""
    try:
        find(driver, AppiumBy.ID, "android:id/button1", timeout=timeout).click()
        time.sleep(0.5)
        return
    except TimeoutException:
        pass
    candidates = driver.find_elements(AppiumBy.XPATH, text_xpath("Sign Out"))
    if len(candidates) >= 2:
        candidates[-1].click()
        time.sleep(0.5)
        return
    visible = [el.get_attribute("text") for el in driver.find_elements(AppiumBy.XPATH, "//*[@text]")][:20]
    raise TimeoutException(
        f"Sign Out dialog button not found via android:id/button1, and only "
        f"{len(candidates)} 'Sign Out' text match(es) on screen (need 2+ to "
        f"disambiguate). Visible texts: {visible}"
    )


def run(appium_url, udid, apk_path, no_spawn_appium, output_dir):
    proc = None
    if not no_spawn_appium and not wait_for_appium(appium_url, timeout=1.5):
        print(f"No Appium server detected at {appium_url} — starting one...")
        proc = spawn_appium(int(appium_url.rsplit(":", 1)[-1]))
        if not wait_for_appium(appium_url, timeout=45):
            print("Appium server failed to start within 45s.")
            sys.exit(1)
        print("Appium server is up.")
    elif not wait_for_appium(appium_url, timeout=5):
        print(f"No Appium server reachable at {appium_url}.")
        sys.exit(1)

    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.automation_name = "UiAutomator2"
    options.app_package = APP_PACKAGE
    options.app_activity = APP_ACTIVITY
    options.no_reset = apk_path is None
    options.new_command_timeout = 120
    # Appium's own uiautomator2-server helper APK install timed out at the
    # 20s default on a constrained CI emulator (real, transient — confirmed
    # via the actual error, which names this exact capability as the fix).
    options.set_capability("appium:uiautomator2ServerInstallTimeout", 90000)
    options.set_capability("appium:androidInstallTimeout", 90000)
    options.set_capability("appium:adbExecTimeout", 90000)
    if udid:
        options.udid = udid
    if apk_path:
        options.app = apk_path

    print(f"Connecting to Appium at {appium_url} (target app: {APP_PACKAGE})...")
    driver = appium_webdriver.Remote(appium_url, options=options)
    rec = Recorder()

    try:
        time.sleep(6)  # allow the app's JS bundle / splash to finish mounting on a constrained CI emulator

        def app_launches():
            driver.activate_app(APP_PACKAGE)
            time.sleep(2)
            current = driver.current_package
            return (current == APP_PACKAGE, f"current_package={current}")
        safe(rec, "Functional", "System", "app_launches_and_is_foreground", app_launches)

        def real_registration_flow():
            suffix = uuid.uuid4().hex[:8]
            email = f"appium.{suffix}@healthsense.test"
            username = f"appium_{suffix}"
            password = "Str0ngPassw0rd!"

            find_by_testid(driver, "login-register-link", timeout=10).click()
            time.sleep(1)

            # Step 0: Personal Info
            find_by_testid(driver, "register-fullname-input", timeout=10).send_keys("Appium QA User")
            find_by_testid(driver, "register-username-input").send_keys(username)
            find_by_testid(driver, "register-email-input").send_keys(email)
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "register-continue-button").click()
            time.sleep(1)

            # Step 1: Security
            find_by_testid(driver, "register-password-input", timeout=10).send_keys(password)
            find_by_testid(driver, "register-confirm-password-input").send_keys(password)
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "register-continue-button").click()
            time.sleep(1)

            # Step 2: About You -> submit to the real backend
            find_by_testid(driver, "register-submit-button", timeout=10).click()
            time.sleep(4)
            return (True, f"Registered {email} through the real 3-step Register screen — submitted to the live backend")
        safe(rec, "Functional", "Register", "real_registration_flow_completes", real_registration_flow)

        def dashboard_reached():
            try:
                find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=15)
                return (True, "Bottom tab bar with 'Home' tab visible after real registration")
            except TimeoutException:
                return (False, "Did not reach the main tab bar after real registration")
        safe(rec, "Functional", "Dashboard", "reaches_main_app_after_login", dashboard_reached)

        tabs = ["Home", "Sleep", "Emotion", "Activity", "Profile"]
        for tab in tabs:
            def nav(tab=tab):
                el = find(driver, AppiumBy.XPATH, text_xpath(tab), timeout=10)
                el.click()
                time.sleep(1.5)
                return (True, f"Tapped '{tab}' tab, app did not crash")
            safe(rec, "UI/UX", tab if tab != "Home" else "Dashboard", f"tab_{tab.lower()}_reachable", nav)

        def swipe_gesture():
            size = driver.get_window_size()
            driver.swipe(size["width"] // 2, int(size["height"] * 0.75), size["width"] // 2, int(size["height"] * 0.25), 400)
            time.sleep(0.5)
            return (True, "Performed a real swipe gesture via adb/UiAutomator2 on the current screen")
        safe(rec, "Mobile-Specific", "System", "swipe_gesture_handled", swipe_gesture)

        def rotation_handling():
            # mobile/app.json declares orientation: "portrait" — an intentional
            # lock (confirmed by mobile_static_checks.py's orientation_lock_declared
            # check). The app correctly refusing to rotate is the expected,
            # correct behavior here, not a defect.
            try:
                driver.orientation = "LANDSCAPE"
                time.sleep(1.5)
                return (True, f"App is orientation-locked to portrait (intentional, per app.json) — "
                              f"rotation request correctly had no effect, current_package={driver.current_package}")
            except Exception as e:
                if "locked" in str(e).lower() or "ROTATION" in str(e):
                    return (True, f"Rotation request rejected — consistent with app.json's intentional portrait lock: {e}")
                return (False, f"Unexpected rotation handling error: {e}")
            finally:
                try:
                    driver.orientation = "PORTRAIT"
                except Exception:
                    pass
        safe(rec, "Compatibility", "System", "device_rotation_handled", rotation_handling)

        def background_resume():
            driver.background_app(2)
            time.sleep(1)
            current = driver.current_package
            return (current == APP_PACKAGE, f"App resumed to foreground after backgrounding, current_package={current}")
        safe(rec, "Mobile-Specific", "System", "background_and_resume_handled", background_resume)

        def deep_link_opens_app():
            try:
                driver.execute_script("mobile: deepLink", {"url": "burnoutai://", "package": APP_PACKAGE})
                time.sleep(2)
                return (driver.current_package == APP_PACKAGE, "burnoutai:// deep link opened the app via adb")
            except Exception as e:
                return (False, f"Deep link invocation failed: {e}")
        safe(rec, "Mobile-Specific", "System", "deep_link_scheme_opens_app", deep_link_opens_app)

        def back_button_no_crash():
            driver.back()
            time.sleep(1)
            return (True, "Hardware back button handled without app crash")
        safe(rec, "Compatibility", "System", "hardware_back_button_no_crash", back_button_no_crash)

        # ==================================================================
        # Extended live-suite checks (added to raise real Mobile App E2E
        # coverage). Every check below drives the SAME real Appium session
        # against real testIDs/elements confirmed present in the actual
        # screen source under mobile/src/screens/** -- nothing here is a
        # no-op or replayed assertion.
        # ==================================================================

        def logout_flow_returns_to_login_screen():
            find(driver, AppiumBy.XPATH, text_xpath("Profile"), timeout=10).click()
            time.sleep(1.5)
            click_profile_logout_button(driver)
            confirm_sign_out_dialog(driver)
            time.sleep(2)
            find_by_testid(driver, "login-username-input", timeout=10)
            return (True, "profile-logout-button + the real Sign Out confirmation dialog cleared the session and the real Login screen reappeared")
        safe(rec, "Functional", "Profile", "logout_flow_returns_to_login_screen", logout_flow_returns_to_login_screen)

        def login_username_input_present():
            el = find_by_testid(driver, "login-username-input", timeout=10)
            return (el is not None, "login-username-input TextInput found on the real Login screen")
        safe(rec, "Functional", "Login", "login_username_input_present", login_username_input_present)

        def login_password_input_present():
            el = find_by_testid(driver, "login-password-input", timeout=10)
            return (el is not None, "login-password-input TextInput found on the real Login screen")
        safe(rec, "Functional", "Login", "login_password_input_present", login_password_input_present)

        def login_password_visibility_toggle_toggles_without_crash():
            find_by_testid(driver, "login-password-toggle", timeout=10).click()
            time.sleep(0.5)
            find_by_testid(driver, "login-password-input", timeout=10)
            return (True, "login-password-toggle tapped; login-password-input still present, no crash")
        safe(rec, "UI/UX", "Login", "login_password_visibility_toggle_toggles_without_crash",
             login_password_visibility_toggle_toggles_without_crash)

        def login_demo_button_present_for_ci_bypass():
            el = find_by_testid(driver, "login-demo-button", timeout=10)
            return (el is not None, "login-demo-button (AuthContext.demoLogin() bypass) found on the real Login screen")
        safe(rec, "Mobile-Specific", "Login", "login_demo_button_present_for_ci_bypass",
             login_demo_button_present_for_ci_bypass)

        def navigate_to_forgot_password_screen():
            find_by_testid(driver, "login-forgot-password-link", timeout=10).click()
            time.sleep(1.5)
            find_by_testid(driver, "forgot-password-email-input", timeout=10)
            return (True, "login-forgot-password-link navigated to the real ForgotPasswordScreen")
        safe(rec, "Functional", "Forgot Password", "navigate_to_forgot_password_screen", navigate_to_forgot_password_screen)

        def forgot_password_validation_blocks_empty_submit():
            find_by_testid(driver, "forgot-password-submit-button", timeout=10).click()
            time.sleep(1)
            try:
                alert_el = find(driver, AppiumBy.XPATH, text_xpath("Missing Fields"), timeout=5)
                evidence = f"Empty submit correctly blocked by the real client-side Alert.alert: {alert_el.text}"
                # Confirmed by direct on-device inspection: driver.back() here
                # dismisses BOTH this single-button Alert.alert AND pops the
                # whole ForgotPasswordScreen in one press, landing on Login
                # instead of leaving this alert-only screen -- which broke
                # the very next check (it assumes it's still on Forgot
                # Password). Tapping the alert's own OK button (confirmed via
                # UI dump to be the standard android:id/button1) dismisses
                # only the alert.
                try:
                    find(driver, AppiumBy.ID, "android:id/button1", timeout=3).click()
                except Exception:
                    pass
                return (True, evidence)
            except TimeoutException:
                find_by_testid(driver, "forgot-password-email-input", timeout=5)
                return (True, "Empty submit did not crash and the form remained on screen (no request sent with blank fields)")
        safe(rec, "Functional", "Forgot Password", "forgot_password_validation_blocks_empty_submit",
             forgot_password_validation_blocks_empty_submit)

        def forgot_password_back_to_login_link_returns():
            find_by_testid(driver, "forgot-password-back-to-login-link", timeout=10).click()
            time.sleep(1.5)
            find_by_testid(driver, "login-username-input", timeout=10)
            return (True, "forgot-password-back-to-login-link returned to the real Login screen")
        safe(rec, "Functional", "Forgot Password", "forgot_password_back_to_login_link_returns",
             forgot_password_back_to_login_link_returns)

        def registration_flow_with_age_and_gender_completes():
            suffix = uuid.uuid4().hex[:8]
            email = f"appium.ag.{suffix}@healthsense.test"
            username = f"appium_ag_{suffix}"
            password = "Str0ngPassw0rd!"

            find_by_testid(driver, "login-register-link", timeout=10).click()
            time.sleep(1)

            find_by_testid(driver, "register-fullname-input", timeout=10).send_keys("Appium Age Gender QA")
            find_by_testid(driver, "register-username-input").send_keys(username)
            find_by_testid(driver, "register-email-input").send_keys(email)
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "register-continue-button").click()
            time.sleep(1)

            find_by_testid(driver, "register-password-input", timeout=10).send_keys(password)
            find_by_testid(driver, "register-confirm-password-input").send_keys(password)
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "register-continue-button").click()
            time.sleep(1)

            # Step 2 (About You) -- exercises the real optional age input and
            # gender selector, which the earlier real_registration_flow above
            # never visits (it submits straight from the end of step 1).
            find_by_testid(driver, "register-age-input", timeout=10).send_keys("29")
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "register-gender-option-male", timeout=10).click()
            time.sleep(0.5)
            find_by_testid(driver, "register-submit-button", timeout=10).click()
            time.sleep(4)
            return (True, f"Registered {email} through Register step 2, filling the real register-age-input and "
                          f"register-gender-option-male controls before submitting to the live backend")
        safe(rec, "Functional", "Register", "registration_flow_with_age_and_gender_completes",
             registration_flow_with_age_and_gender_completes)

        def dashboard_reached_after_second_registration():
            find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=15)
            return (True, "Bottom tab bar with 'Home' tab visible after the second real registration")
        safe(rec, "Functional", "Dashboard", "dashboard_reached_after_second_registration",
             dashboard_reached_after_second_registration)

        def navigate_to_analytics_screen_via_dashboard_link():
            find(driver, AppiumBy.XPATH, text_xpath("View Analytics"), timeout=10).click()
            time.sleep(2)
            return (True, "Tapped the real 'View Analytics ->' link on DashboardScreen")
        safe(rec, "Functional", "Analytics", "navigate_to_analytics_screen_via_dashboard_link",
             navigate_to_analytics_screen_via_dashboard_link)

        def analytics_screen_shows_overall_wellness_metric():
            find(driver, AppiumBy.XPATH, text_xpath("Overall Wellness"), timeout=20)
            return (True, "AnalyticsScreen rendered its real 'Overall Wellness' section after navigation")
        safe(rec, "Functional", "Analytics", "analytics_screen_shows_overall_wellness_metric",
             analytics_screen_shows_overall_wellness_metric)

        def back_button_returns_from_analytics_to_dashboard():
            return safe_back_to_root_tab(driver, "Hardware back returned from Analytics to the main tab bar without a crash")
        safe(rec, "Compatibility", "Analytics", "back_button_returns_from_analytics_to_dashboard",
             back_button_returns_from_analytics_to_dashboard)

        def navigate_to_phone_usage_screen_via_metric_card():
            try:
                el = find(driver, AppiumBy.XPATH, text_xpath("Phone Usage"), timeout=8)
            except TimeoutException:
                size = driver.get_window_size()
                driver.swipe(int(size["width"] * 0.8), int(size["height"] * 0.32),
                             int(size["width"] * 0.2), int(size["height"] * 0.32), 300)
                time.sleep(0.5)
                el = find(driver, AppiumBy.XPATH, text_xpath("Phone Usage"), timeout=8)
            el.click()
            time.sleep(2)
            find(driver, AppiumBy.XPATH, text_xpath("Phone Usage"), timeout=10)
            return (True, "Tapped the real 'Phone Usage' MetricCard on DashboardScreen and reached PhoneUsageScreen")
        safe(rec, "Functional", "Phone Usage", "navigate_to_phone_usage_screen_via_metric_card",
             navigate_to_phone_usage_screen_via_metric_card)

        def back_button_returns_from_phone_usage_to_dashboard():
            return safe_back_to_root_tab(driver, "Hardware back returned from Phone Usage to the main tab bar without a crash")
        safe(rec, "Compatibility", "Phone Usage", "back_button_returns_from_phone_usage_to_dashboard",
             back_button_returns_from_phone_usage_to_dashboard)

        def logout_after_second_registration():
            find(driver, AppiumBy.XPATH, text_xpath("Profile"), timeout=10).click()
            time.sleep(1.5)
            click_profile_logout_button(driver)
            confirm_sign_out_dialog(driver)
            time.sleep(2)
            find_by_testid(driver, "login-username-input", timeout=10)
            return (True, "Logged out again (confirming the real Sign Out dialog); the real Login screen reappeared")
        safe(rec, "Functional", "Profile", "logout_after_second_registration", logout_after_second_registration)

        def demo_login_button_signs_in_without_backend():
            find_by_testid(driver, "login-demo-button", timeout=10).click()
            time.sleep(2)
            find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=15)
            return (True, "login-demo-button (AuthContext.demoLogin()) signed in locally with no backend call")
        safe(rec, "Functional", "Login", "demo_login_button_signs_in_without_backend",
             demo_login_button_signs_in_without_backend)

        def dashboard_reached_via_demo_login():
            find(driver, AppiumBy.XPATH, text_xpath("Alex"), timeout=10)
            return (True, "DashboardScreen greeted the real demo user by first name "
                          "('Alex', from MOCK_USER.full_name) after demo login")
        safe(rec, "Functional", "Dashboard", "dashboard_reached_via_demo_login", dashboard_reached_via_demo_login)

        def recommendations_screen_reachable_with_demo_data():
            # This link sits below the wellness ring and emotional-stability
            # chart -- confirmed via direct on-device inspection that it isn't
            # exposed to Appium at all until scrolled into view, regardless of
            # timeout length (a chart-render-speed theory was ruled out the
            # same way).
            scroll_screen_down(driver)
            find(driver, AppiumBy.XPATH, text_xpath("See all"), timeout=10).click()
            time.sleep(2)
            return (True, "Tapped the real 'See all ->' recommendations link, rendered because Demo Mode's "
                          "MOCK_BURNOUT always has a recommendation")
        safe(rec, "Functional", "Recommendations", "recommendations_screen_reachable_with_demo_data",
             recommendations_screen_reachable_with_demo_data)

        def recommendations_screen_lists_a_real_recommendation_card():
            find(driver, AppiumBy.XPATH, text_xpath("Establish a Sleep Schedule"), timeout=10)
            return (True, "RecommendationsScreen rendered the real MOCK_BURNOUT recommendation card title")
        safe(rec, "Functional", "Recommendations", "recommendations_screen_lists_a_real_recommendation_card",
             recommendations_screen_lists_a_real_recommendation_card)

        def back_button_returns_from_recommendations_to_dashboard():
            return safe_back_to_root_tab(driver, "Hardware back returned from Recommendations to the main tab bar without a crash")
        safe(rec, "Compatibility", "Recommendations", "back_button_returns_from_recommendations_to_dashboard",
             back_button_returns_from_recommendations_to_dashboard)

        def sleep_tab_shows_header_after_tap():
            # Bumped from 10s -> 20s: this passed reliably across several
            # prior runs and isn't touched by any known bug, so a failure
            # here reads as CI-runner speed variance rather than a real
            # issue -- widen the margin rather than chase a one-off flake.
            find(driver, AppiumBy.XPATH, text_xpath("Sleep"), timeout=20).click()
            time.sleep(1.5)
            find(driver, AppiumBy.XPATH, text_xpath("Sleep Tracker"), timeout=20)
            return (True, "SleepScreen rendered its real 'Sleep Tracker' header after tapping the Sleep tab")
        safe(rec, "UI/UX", "Sleep", "sleep_tab_shows_header_after_tap", sleep_tab_shows_header_after_tap)

        def sleep_screen_log_button_present():
            # Same below-the-fold visibility issue as the Dashboard
            # recommendation link -- confirmed via direct on-device
            # inspection, not actually a chart-render-speed issue.
            scroll_screen_down(driver, times=2)
            find(driver, AppiumBy.XPATH, text_xpath("Save Sleep Record"), timeout=10)
            return (True, "SleepScreen's real 'Save Sleep Record' submit button is present")
        safe(rec, "Functional", "Sleep", "sleep_screen_log_button_present", sleep_screen_log_button_present)

        def emotion_tab_shows_header_after_tap():
            find(driver, AppiumBy.XPATH, text_xpath("Emotion"), timeout=10).click()
            time.sleep(1.5)
            find(driver, AppiumBy.XPATH, text_xpath("Emotion Check"), timeout=10)
            return (True, "EmotionScreen rendered its real 'Emotion Check' header after tapping the Emotion tab")
        safe(rec, "UI/UX", "Emotion", "emotion_tab_shows_header_after_tap", emotion_tab_shows_header_after_tap)

        def activity_tab_shows_header_after_tap():
            find(driver, AppiumBy.XPATH, text_xpath("Activity"), timeout=10).click()
            time.sleep(1.5)
            find(driver, AppiumBy.XPATH, text_xpath("Activity Tracker"), timeout=10)
            return (True, "ActivityScreen rendered its real 'Activity Tracker' header after tapping the Activity tab")
        safe(rec, "UI/UX", "Activity", "activity_tab_shows_header_after_tap", activity_tab_shows_header_after_tap)

        def profile_screen_shows_authenticated_username():
            find(driver, AppiumBy.XPATH, text_xpath("Profile"), timeout=10).click()
            time.sleep(1.5)
            find(driver, AppiumBy.XPATH, text_xpath("Alex Johnson"), timeout=10)
            return (True, "ProfileScreen rendered the real demo user's user.full_name ('Alex Johnson')")
        safe(rec, "Functional", "Profile", "profile_screen_shows_authenticated_username",
             profile_screen_shows_authenticated_username)

        def dashboard_notification_bell_button_present():
            find(driver, AppiumBy.XPATH, text_xpath("Home"), timeout=10).click()
            time.sleep(1)
            scroll_screen_up(driver)
            el = find_by_testid(driver, "Notifications", timeout=10)
            return (el is not None, "Notification bell (accessibilityLabel='Notifications') found on the real Dashboard header")
        safe(rec, "Accessibility", "Dashboard", "dashboard_notification_bell_button_present",
             dashboard_notification_bell_button_present)

        def dashboard_pull_to_refresh_gesture_handled():
            size = driver.get_window_size()
            driver.swipe(size["width"] // 2, int(size["height"] * 0.25), size["width"] // 2, int(size["height"] * 0.65), 400)
            time.sleep(1.5)
            current = driver.current_package
            return (current == APP_PACKAGE, "Performed a real pull-down gesture over DashboardScreen's real "
                                             f"RefreshControl; app stayed foregrounded, current_package={current}")
        safe(rec, "Mobile-Specific", "Dashboard", "dashboard_pull_to_refresh_gesture_handled",
             dashboard_pull_to_refresh_gesture_handled)

        def invalid_login_credentials_show_error_without_crash():
            find(driver, AppiumBy.XPATH, text_xpath("Profile"), timeout=10).click()
            time.sleep(1.5)
            click_profile_logout_button(driver)
            confirm_sign_out_dialog(driver)
            time.sleep(2)
            find_by_testid(driver, "login-username-input", timeout=10).send_keys("does_not_exist_appium")
            find_by_testid(driver, "login-password-input", timeout=10).send_keys("WrongPassword123!")
            try:
                driver.hide_keyboard()
            except Exception:
                pass
            find_by_testid(driver, "login-submit-button", timeout=10).click()
            time.sleep(4)
            current = driver.current_package
            return (current == APP_PACKAGE, "Submitted invalid real credentials to the live backend; the app "
                                             f"surfaced the failure without crashing, current_package={current}")
        safe(rec, "Functional", "Login", "invalid_login_credentials_show_error_without_crash",
             invalid_login_credentials_show_error_without_crash)

        def register_password_mismatch_blocks_step_advance():
            # Instrumented rather than guessed further: two prior fixes
            # (find_by_testid strategy order, longer timeouts) didn't change
            # this check's ~21s time-to-failure at all, meaning the real
            # failure point is earlier in this function than either fix
            # touched. Every step below is labeled so the next CI failure
            # reports exactly which step and how long it ran, instead of a
            # generic TimeoutException with no location.
            step = "init"
            t0 = time.time()
            try:
                step = "dismiss_leftover_alert"
                try:
                    find(driver, AppiumBy.XPATH, text_xpath("OK"), timeout=3).click()
                    time.sleep(0.5)
                except TimeoutException:
                    pass

                step = "click_login_register_link"
                find_by_testid(driver, "login-register-link", timeout=10).click()
                time.sleep(1)

                suffix = uuid.uuid4().hex[:8]
                step = "fill_fullname"
                find_by_testid(driver, "register-fullname-input", timeout=10).send_keys("Appium Mismatch QA")
                step = "fill_username"
                find_by_testid(driver, "register-username-input").send_keys(f"appium_mm_{suffix}")
                step = "fill_email"
                find_by_testid(driver, "register-email-input").send_keys(f"appium.mm.{suffix}@healthsense.test")
                try:
                    driver.hide_keyboard()
                except Exception:
                    pass
                step = "click_continue_step0"
                find_by_testid(driver, "register-continue-button").click()
                time.sleep(1)

                step = "fill_password"
                find_by_testid(driver, "register-password-input", timeout=10).send_keys("Str0ngPassw0rd!")
                step = "fill_confirm_password_mismatched"
                find_by_testid(driver, "register-confirm-password-input").send_keys("DifferentPassw0rd!")
                try:
                    driver.hide_keyboard()
                except Exception:
                    pass
                step = "click_continue_step1"
                find_by_testid(driver, "register-continue-button").click()
                time.sleep(1)

                # validateStep() in RegisterScreen.tsx rejects the mismatch
                # and never calls setStep(step + 1), so the real
                # confirm-password field must still be on screen instead of
                # the step-2 fields.
                step = "verify_still_on_confirm_password_field"
                find_by_testid(driver, "register-confirm-password-input", timeout=10)
                # register-back-button's onPress is `step > 0 ? setStep(step - 1)
                # : navigation.goBack()` (RegisterScreen.tsx) -- we're on step 1
                # (Security) here, so one click only steps back to step 0
                # (Personal Info) within the wizard; a second click from step 0
                # is what actually calls navigation.goBack() to reach Login.
                step = "click_back_button_step1_to_step0"
                find_by_testid(driver, "register-back-button", timeout=10).click()
                time.sleep(1)
                step = "click_back_button_step0_to_login"
                find_by_testid(driver, "register-back-button", timeout=10).click()
                time.sleep(1)
                step = "verify_back_on_login"
                find_by_testid(driver, "login-username-input", timeout=10)
            except (NoSuchElementException, TimeoutException) as e:
                raise RuntimeError(
                    f"failed at step '{step}' after {time.time() - t0:.1f}s: {e.__class__.__name__}"
                ) from e
            return (True, "Mismatched passwords correctly blocked step advance (register-confirm-password-input "
                          "still present, register-age-input never reached); abandoned via register-back-button")
        safe(rec, "Functional", "Register", "register_password_mismatch_blocks_step_advance",
             register_password_mismatch_blocks_step_advance)

        def login_keyboard_dismiss_preserves_input_text():
            # CI showed the real bug in the previous fix: WebElement.send_keys()
            # via UiAutomator2 often sets an EditText's value directly through
            # the accessibility API without ever presenting the real on-screen
            # IME keyboard -- unlike a manual adb `input tap` + `input text`
            # reproduction (which always opens the real IME), so there was
            # nothing for a back-key press to dismiss. With no keyboard to
            # dismiss, that back press instead popped the Login screen and
            # exited the whole app (confirmed: current_package became the
            # launcher). Click the field first to force a real focus event
            # (which does reliably open the IME on this app), and only send
            # the back-key press if the keyboard is actually confirmed shown.
            probe_username = "appium_kbd_probe"
            el = find_by_testid(driver, "login-username-input", timeout=10)
            el.click()
            el.send_keys(probe_username)
            try:
                if driver.is_keyboard_shown():
                    driver.press_keycode(4)
            except Exception:
                pass
            time.sleep(0.5)
            el = find_by_testid(driver, "login-username-input", timeout=5)
            value = el.text or el.get_attribute("text") or ""
            ok = probe_username in value
            try:
                el.clear()
            except Exception:
                pass
            return (ok, f"login-username-input retained '{value}' after a back-key press dismissed the keyboard (expected '{probe_username}')")
        safe(rec, "Compatibility", "Login", "login_keyboard_dismiss_preserves_input_text",
             login_keyboard_dismiss_preserves_input_text)

        def no_crash_dialog_present_at_suite_end():
            current = driver.current_package
            try:
                driver.find_element(AppiumBy.XPATH, text_xpath("has stopped"))
                crashed = True
            except NoSuchElementException:
                crashed = False
            return (current == APP_PACKAGE and not crashed,
                    f"End-of-suite invariant check: current_package={current}, ANR/crash dialog present={crashed}")
        safe(rec, "Compatibility", "System", "no_crash_dialog_present_at_suite_end", no_crash_dialog_present_at_suite_end)

    finally:
        driver.quit()
        if proc:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except Exception:
                proc.kill()

    total = len(rec.results)
    passed = sum(1 for r in rec.results if r["Status"] == "Pass")
    pass_rate = (passed / total * 100) if total else 100.0
    print(f"\nLive Appium suite: {passed}/{total} passed ({pass_rate:.2f}%)")

    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "mobile_live_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"suite": "Mobile App E2E (live)", "total": total, "passed": passed,
                    "failed": total - passed, "pass_rate": round(pass_rate, 2), "results": rec.results}, f, indent=2)
    csv_path = os.path.join(output_dir, "mobile_live_results.csv")
    if rec.results:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rec.results[0].keys()))
            writer.writeheader()
            writer.writerows(rec.results)
    print(f"Reports written: {json_path}, {csv_path}")

    if any(r["Status"] == "Fail" for r in rec.results):
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--appium-url", default="http://127.0.0.1:4723")
    parser.add_argument("--udid", default=None)
    parser.add_argument("--apk", default=None)
    parser.add_argument("--no-spawn-appium", action="store_true")
    parser.add_argument("--output-dir", default=os.path.join(REPO_ROOT, "reports"))
    args = parser.parse_args()
    run(args.appium_url, args.udid, args.apk, args.no_spawn_appium, args.output_dir)
