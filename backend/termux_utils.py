# backend/termux_utils.py
# Shared Termux/ARM Chrome & ChromeDriver detection utilities.
# Imported by aiwa_multi.py, insta_multi.py, and insta_reposter.py.
#
# KEY DESIGN DECISIONS:
#   - Uses os.path.exists() exclusively — shutil.which() requires the 'which'
#     binary which is NOT installed in Termux by default.
#   - Never calls ChromeDriverManager().install() — it downloads an x86_64
#     binary that WILL NOT run on aarch64 (Android ARM). The Termux chromium
#     package bundles the correct aarch64 chromedriver already.
#   - Removes --single-process — this flag causes immediate crashes on
#     Android's kernel due to seccomp/namespace restrictions.
#   - Removes duplicate --remote-debugging-port flags.
#   - Merges all add_experimental_option("prefs") calls into one (Selenium
#     silently drops earlier calls if the same key is set more than once).

import os
from selenium import webdriver


# ---------------------------------------------------------------------------
# Ordered priority list of known Chromium binary locations
# ---------------------------------------------------------------------------
_CHROME_BINARY_CANDIDATES = [
    # Termux native (confirmed present: symlink to chromium-launcher.sh)
    "/data/data/com.termux/files/usr/lib/chromium/chromium-launcher.sh",
    "/data/data/com.termux/files/usr/bin/chromium-browser",
    "/data/data/com.termux/files/usr/bin/chromium",
    "/data/data/com.termux/files/usr/lib/chromium/chromium",
    # Kali-NetHunter / proot-distro Kali inside Termux
    "/data/data/com.termux/files/home/kali-arm64/usr/lib/chromium/chromium",
    "/data/data/com.termux/files/home/kali-arm64/usr/bin/chromium",
    # Generic Linux fallbacks (cloud / VPS deployments)
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/local/bin/chromium",
]

_CHROMEDRIVER_CANDIDATES = [
    # Termux native (symlink confirmed: ../lib/chromium/chromedriver)
    "/data/data/com.termux/files/usr/bin/chromedriver",
    "/data/data/com.termux/files/usr/lib/chromium/chromedriver",
    # Kali-in-Termux
    "/data/data/com.termux/files/home/kali-arm64/usr/lib/chromium/chromedriver",
    "/data/data/com.termux/files/home/kali-arm64/usr/bin/chromedriver",
    # Generic Linux fallbacks
    "/usr/bin/chromedriver",
    "/usr/local/bin/chromedriver",
]


def find_chrome_binary(log_fn=print) -> str | None:
    """
    Return the absolute path of the first Chromium/Chrome binary found,
    or None if nothing is located.
    """
    for p in _CHROME_BINARY_CANDIDATES:
        if os.path.exists(p):
            log_fn(f"[termux_utils] Found Chrome binary: {p}")
            return p
    log_fn("[termux_utils] ERROR: Chrome binary not found in any known path. "
           "On Termux run: pkg install chromium")
    return None


def find_chromedriver(log_fn=print) -> str | None:
    """
    Return the absolute path of the first chromedriver found, or None.
    NEVER falls back to ChromeDriverManager — wrong architecture on ARM.
    """
    for p in _CHROMEDRIVER_CANDIDATES:
        if os.path.exists(p):
            log_fn(f"[termux_utils] Found ChromeDriver: {p}")
            return p
    log_fn("[termux_utils] FATAL: ChromeDriver not found. "
           "On Termux run: pkg install chromium  (chromedriver is bundled). "
           "Do NOT use ChromeDriverManager on ARM — it installs x86_64 binaries.")
    return None


def build_chrome_options(
    session_path: str,
    proxy_server: str = "",
    block_images: bool = True,
    extra_args: list[str] | None = None,
) -> webdriver.ChromeOptions:
    """
    Build a ChromeOptions object tuned for headless Termux/ARM operation.

    Args:
        session_path:  Absolute path to the persistent --user-data-dir folder.
        proxy_server:  Optional 'host:port' proxy string (from PROXY_SERVER env).
        block_images:  If True, disables image loading to save RAM.
        extra_args:    Any additional --flags the caller wants to append.

    Returns:
        A fully configured ChromeOptions instance ready to be passed to
        webdriver.Chrome().
    """
    opts = webdriver.ChromeOptions()

    # ── Binary location ────────────────────────────────────────────────────
    chrome_binary = find_chrome_binary()
    if chrome_binary:
        opts.binary_location = chrome_binary

    # ── Anti-bot-detection ─────────────────────────────────────────────────
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    )
    opts.add_argument("--disable-infobars")

    # ── Headless / memory / compatibility ──────────────────────────────────
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-setuid-sandbox")
    opts.add_argument("--disable-seccomp-filter-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--no-zygote")
    # --single-process INTENTIONALLY OMITTED — crashes Android kernel (seccomp)
    opts.add_argument("--disable-software-rasterizer")
    opts.add_argument("--disable-features=VizDisplayCompositor")
    opts.add_argument("--metrics-recording-only")
    opts.add_argument("--mute-audio")
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    opts.add_argument("--disable-application-cache")
    opts.add_argument("--password-store=basic")
    opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--disable-extensions")

    # ── Human-like viewport ────────────────────────────────────────────────
    opts.add_argument("--window-size=1920,1080")

    # ── Proxy ──────────────────────────────────────────────────────────────
    if proxy_server:
        opts.add_argument(f"--proxy-server={proxy_server}")

    # ── Persistent session directory ───────────────────────────────────────
    opts.add_argument(f"--user-data-dir={session_path}")

    # ── Prefs (ONE call only — Selenium silently drops duplicates) ─────────
    prefs: dict = {"intl.accept_languages": "en-US,en"}
    if block_images:
        prefs["profile.managed_default_content_settings.images"] = 2
    opts.add_experimental_option("prefs", prefs)

    # ── Page load strategy ─────────────────────────────────────────────────
    opts.page_load_strategy = "eager"

    # ── Caller extras ──────────────────────────────────────────────────────
    for arg in (extra_args or []):
        opts.add_argument(arg)

    return opts


# Stealth JS injected via CDP before any page load
STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
window.chrome = { runtime: {} };
const _origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (p) =>
    p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : _origQuery(p);
"""
