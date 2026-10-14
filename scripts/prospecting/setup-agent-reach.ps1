# XEND-AGENT-REACH-001 - user-only Windows setup and diagnostics.
# No admin elevation, no --system, no credential access or social actions.
[CmdletBinding()]
param([switch]$Setup)

$ErrorActionPreference = 'Stop'
$venv = Join-Path $env:USERPROFILE '.agent-reach-venv'
$python = Join-Path $venv 'Scripts\python.exe'
$cli = Join-Path $venv 'Scripts\agent-reach.exe'
$upstream = 'https://github.com/Panniantong/Agent-Reach/archive/94f06c1969dfc1834001269d79d3ad0972d9dee6.zip'

if ($Setup) {
    if (-not (Test-Path $python)) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            & py -3 -m venv $venv
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            & python -m venv $venv
        } else {
            throw 'Python 3.10+ is required. Install Python via its official Windows installer and rerun.'
        }
        if ($LASTEXITCODE -ne 0) { throw 'Could not create Python venv. Confirm that Python 3.10+ is installed.' }
    }
    Write-Host 'Installing pinned Agent-Reach package in user virtual environment (not system-wide)...'
    & $python -m pip install --disable-pip-version-check $upstream
    if ($LASTEXITCODE -ne 0) { throw 'Agent-Reach package install failed. Review pip output; no system packages were changed.' }
}

if (-not (Test-Path $cli)) {
    Write-Host 'Agent-Reach is not installed in the user-only environment.'
    Write-Host 'To install the pinned package, run: .\scripts\prospecting\setup-agent-reach.ps1 -Setup'
    exit 2
}

$env:AGENT_REACH_LANG = 'en'
Write-Host ''
Write-Host 'Agent-Reach dependency check (read-only; no --system):'
& $cli install --env=auto
$installCode = $LASTEXITCODE
Write-Host ''
Write-Host 'Agent-Reach channel diagnostics:'
& $cli doctor
$doctorCode = $LASTEXITCODE
Write-Host ''
Write-Host 'Review any missing dependencies or inactive channels before enabling additional capabilities.'
Write-Host 'Do not export cookies or run mass social messages. See docs/AGENT_REACH_XENDER.md.'
if ($installCode -ne 0 -or $doctorCode -ne 0) {
    Write-Warning "Dependency check exit code $installCode; doctor exit code $doctorCode. Read the diagnostics above."
    exit 1
}
