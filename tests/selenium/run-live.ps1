# Runs the Selenium suite against the live Firebase site with a visible,
# slowed-down Chrome window (for the Automation Testing video).
# From the project folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File tests\selenium\run-live.ps1
# Needs Node.js 22+, Google Chrome, and `npm ci` run once in the project folder.
# Passwords are typed at the prompt and never saved.

param(
  [string]$BaseUrl = "https://track-and-trace-bulsu-2026.web.app",
  [int]$SlowMo = 700
)

function Read-Secret([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

Write-Host "Selenium suite against $BaseUrl" -ForegroundColor Cyan
$env:BASE_URL = $BaseUrl
$env:STUDENT_EMAIL = Read-Host "Student test account email (STUDENT-A)"
$env:STUDENT_PASSWORD = Read-Secret "Student password"
$env:ADMIN_EMAIL = Read-Host "Admin email (leave empty to skip the admin test)"
if ($env:ADMIN_EMAIL) { $env:ADMIN_PASSWORD = Read-Secret "Admin password" }
Write-Host "Found item used for search, privacy, and claim tests (reported by STUDENT-B and verified by the office):"
$env:FOUND_ITEM_KEYWORD = Read-Host "  Word from its name (e.g. umbrella)"
$env:FOUND_ITEM_CATEGORY = Read-Host "  Its category as the search filter shows it (press Enter to detect it automatically)"
$env:FOUND_ITEM_HIDDEN = Read-Host "  A few words from its hidden details"
$env:HEADED = "1"
$env:SLOW_MO = "$SlowMo"

npm run test:selenium
$code = $LASTEXITCODE
if ($code -eq 0) { Write-Host "All Selenium tests passed." -ForegroundColor Green }
else { Write-Host "Some tests failed. Screenshots and page HTML are in test-results\selenium\" -ForegroundColor Yellow }
exit $code
