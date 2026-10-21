param([Parameter(Mandatory = $true)][uri]$Url)

$ErrorActionPreference = 'Stop'
if ($env:NUTRIMOM_DEV_BROWSER_AUTHORIZED -ne '1' -or $env:CODEX_TOOL_CALL_ID -or
    (@($env:CI, $env:CODEX_CI) | Where-Object { $_ -and $_ -notin @('0', 'false', 'no', 'off') })) {
    exit 0
}
if ($Url.Scheme -notin @('http', 'https')) { throw 'Invalid dev server URL' }

# Resolve the installed browser instead of hard-coding one user's installation.
$taskOperaCandidates = @()
foreach ($taskRegistryPath in @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\opera.exe',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\opera.exe'
)) {
    if (Test-Path -LiteralPath $taskRegistryPath) {
        $taskOperaCandidates += (Get-Item -LiteralPath $taskRegistryPath).GetValue('').Trim('"')
    }
}
foreach ($taskInstallRoot in @($env:LOCALAPPDATA, $env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if ($taskInstallRoot) {
        foreach ($taskRelativePath in @('Programs\Opera GX\opera.exe', 'Programs\Opera\opera.exe', 'Opera GX\opera.exe', 'Opera\opera.exe')) {
            $taskOperaCandidates += Join-Path $taskInstallRoot $taskRelativePath
        }
    }
}
$taskOperaExecutable = $taskOperaCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $taskOperaExecutable) {
    Write-Warning '[dev] Opera was not found. Opening the default browser instead.'
    Start-Process -FilePath $Url.AbsoluteUri
    exit 0
}

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NutriMomDevWindow {
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr window, int command);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
}
'@

# A visible browser is explicitly intended here; the PowerShell helper stays hidden.
$null = Start-Process -FilePath $taskOperaExecutable -ArgumentList @('--new-tab', $Url.AbsoluteUri) -WindowStyle Normal -PassThru
$taskShell = New-Object -ComObject WScript.Shell
$taskDeadline = [DateTime]::UtcNow.AddSeconds(2)
do {
    $taskOperaWindow = Get-Process -Name opera -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 -and $_.Path -eq $taskOperaExecutable } |
        Select-Object -First 1
    if ($taskOperaWindow) { break }
    Start-Sleep -Milliseconds 150
} while ([DateTime]::UtcNow -lt $taskDeadline)

# One foreground request after an explicitly interactive launch; never keep
# pulling the user back if they switch to another app.
if ($taskOperaWindow) {
    $taskWindowHandle = $taskOperaWindow.MainWindowHandle
    if ([NutriMomDevWindow]::IsIconic($taskWindowHandle)) {
        $null = [NutriMomDevWindow]::ShowWindowAsync($taskWindowHandle, 9)
    }
    $null = $taskShell.AppActivate($taskOperaWindow.Id)
    $null = [NutriMomDevWindow]::SetForegroundWindow($taskWindowHandle)
}
Write-Host "[dev] Opened $($Url.AbsoluteUri) in Opera."
