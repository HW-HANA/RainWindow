param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:4173/'
function Test-RainWindow {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('RainWindow')
    } catch { return $false }
}
if (-not (Test-RainWindow)) {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $PSScriptRoot 'server.cjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'server-error.log')
    for ($i = 0; $i -lt 15; $i++) {
        if (Test-RainWindow) { break }
        Start-Sleep -Milliseconds 300
    }
}
if (-not (Test-RainWindow)) { throw 'Could not start RainWindow. Check server-error.log and port 4173.' }
Write-Output "RainWindow ready: $url"
if (-not $NoBrowser) { Start-Process $url }
