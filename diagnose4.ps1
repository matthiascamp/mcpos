# diagnose4.ps1 — "Works on one register, not the other" diagnostic
# Run: powershell -ExecutionPolicy Bypass -File diagnose4.ps1
# Checks every environmental difference that could cause one register to fail.
# No Node/npm needed — pure PowerShell. Run on BOTH registers and diff the output.

param(
    [switch]$TestPrint,     # Actually send a test receipt (-TestPrint)
    [switch]$TestDrawer,    # Send drawer kick (-TestDrawer)
    [switch]$Fix            # Attempt automatic fixes (-Fix)
)

$ErrorActionPreference = 'SilentlyContinue'
$divider = '=' * 70

function Section($n, $title) {
    Write-Host "`n$divider" -ForegroundColor Cyan
    Write-Host "  $n. $title" -ForegroundColor Cyan
    Write-Host $divider -ForegroundColor Cyan
}

function Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "  $msg" }

Write-Host "`n$divider" -ForegroundColor White
Write-Host "  CRISP POS REGISTER DIAGNOSTIC v4" -ForegroundColor White
Write-Host "  Run on BOTH registers and compare output" -ForegroundColor Gray
Write-Host $divider -ForegroundColor White
Write-Host "  Date:     $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "  Computer: $env:COMPUTERNAME"
Write-Host "  User:     $env:USERNAME"
Write-Host "  OS:       $((Get-CimInstance Win32_OperatingSystem).Caption)"
Write-Host "  Arch:     $env:PROCESSOR_ARCHITECTURE"
Write-Host "  PSVersion: $($PSVersionTable.PSVersion)"

# ── 1. PRINT SPOOLER SERVICE ──────────────────────────────────────────────
Section 1 "PRINT SPOOLER SERVICE"
$spooler = Get-Service Spooler -ErrorAction SilentlyContinue
if ($spooler) {
    if ($spooler.Status -eq 'Running') {
        Ok "Spooler is RUNNING (StartType: $($spooler.StartType))"
    } else {
        Fail "Spooler is $($spooler.Status) — printing WILL NOT WORK"
        if ($Fix) {
            Warn "Attempting to start Spooler..."
            Start-Service Spooler -ErrorAction SilentlyContinue
            Start-Sleep 1
            $spooler = Get-Service Spooler
            if ($spooler.Status -eq 'Running') { Ok "Spooler started!" }
            else { Fail "Could not start Spooler — may need admin rights" }
        }
    }
} else {
    Fail "Spooler service not found!"
}

# ── 2. POWERSHELL EXECUTION POLICY ───────────────────────────────────────
Section 2 "POWERSHELL EXECUTION POLICY"
$policies = @(
    @{ Scope = 'MachinePolicy'; Policy = (Get-ExecutionPolicy -Scope MachinePolicy) },
    @{ Scope = 'UserPolicy';    Policy = (Get-ExecutionPolicy -Scope UserPolicy) },
    @{ Scope = 'Process';       Policy = (Get-ExecutionPolicy -Scope Process) },
    @{ Scope = 'CurrentUser';   Policy = (Get-ExecutionPolicy -Scope CurrentUser) },
    @{ Scope = 'LocalMachine';  Policy = (Get-ExecutionPolicy -Scope LocalMachine) }
)
$blocked = $false
foreach ($p in $policies) {
    $status = if ($p.Policy -eq 'Restricted' -or $p.Policy -eq 'AllSigned') { 'RESTRICTIVE'; $blocked = $true } else { 'ok' }
    $color = if ($status -eq 'ok') { 'Green' } else { 'Yellow' }
    Write-Host "  [$status] $($p.Scope): $($p.Policy)" -ForegroundColor $color
}
if ($blocked) {
    Warn "A restrictive policy exists — rawprint.ps1 uses -ExecutionPolicy Bypass which overrides Process scope"
    Warn "BUT MachinePolicy/UserPolicy (set via Group Policy) CANNOT be overridden by -ExecutionPolicy Bypass"
    $machinePolicy = Get-ExecutionPolicy -Scope MachinePolicy
    if ($machinePolicy -eq 'Restricted' -or $machinePolicy -eq 'AllSigned') {
        Fail "MachinePolicy is '$machinePolicy' — THIS BLOCKS rawprint.ps1 EVEN WITH -ExecutionPolicy Bypass"
        Fail "Fix: Ask IT to set GPO 'Turn on Script Execution' to 'Allow all scripts' or 'Allow local scripts'"
    }
} else {
    Ok "No restrictive policies — rawprint.ps1 will execute fine"
}

# ── 3. PRINTER QUEUES (full detail) ─────────────────────────────────────
Section 3 "PRINTER QUEUES"
$printers = Get-Printer -ErrorAction SilentlyContinue
$receiptPrinter = $null
$receiptKeywords = @('epson', 'tm-t', 'tm-m', 'tm-u', 'thermal', 'receipt', '80mm', '58mm', 'pos', 'star ', 'bixolon', 'citizen', 'generic')

if ($printers) {
    foreach ($p in $printers) {
        $combined = "$($p.Name) $($p.DriverName)".ToLower()
        $isReceipt = $false
        foreach ($kw in $receiptKeywords) {
            if ($combined.Contains($kw)) { $isReceipt = $true; break }
        }
        # Also check USB port
        if ($p.PortName -like 'USB*') { $isReceipt = $true }

        $statusText = switch ($p.PrinterStatus) {
            0 { 'Normal' }; 1 { 'Paused' }; 2 { 'Error' }; 3 { 'Deleting' }
            4 { 'Paper Jam' }; 5 { 'Paper Out' }; 6 { 'Manual Feed' }
            7 { 'Paper Problem' }; 8 { 'Offline' }; default { "Unknown ($($p.PrinterStatus))" }
        }

        $tag = if ($isReceipt) { ' <<< RECEIPT PRINTER' } else { '' }
        $color = if ($isReceipt) { 'White' } else { 'Gray' }
        Write-Host "  $($p.Name)$tag" -ForegroundColor $color
        Info "    Driver: $($p.DriverName)"
        Info "    Port:   $($p.PortName)"

        # Status check
        if ($p.PrinterStatus -eq 0) {
            Write-Host "    Status: $statusText" -ForegroundColor Green
        } else {
            Write-Host "    Status: $statusText" -ForegroundColor Red
        }

        # Check if driver supports RAW datatype
        $driver = Get-PrinterDriver -Name $p.DriverName -ErrorAction SilentlyContinue
        if ($driver) {
            Info "    Driver env: $($driver.PrinterEnvironment)"
        }

        # Duplicate detection
        if ($p.Name -match '\(\d+\)$') {
            Warn "    This looks like a DUPLICATE queue — Windows creates these when USB port changes"
        }

        if ($isReceipt -and !$receiptPrinter) { $receiptPrinter = $p }
    }
} else {
    Fail "No printers found (or Get-Printer not available)"
}

if ($receiptPrinter) {
    Write-Host "`n  >>> Best receipt printer: `"$($receiptPrinter.Name)`"" -ForegroundColor Green
} else {
    Fail "No receipt printer detected"
}

# ── 4. WMI PRINTER DEEP STATUS ──────────────────────────────────────────
Section 4 "WMI PRINTER DEEP STATUS"
if ($receiptPrinter) {
    $wmi = Get-WmiObject Win32_Printer -Filter "Name='$($receiptPrinter.Name -replace "'","''")'" -ErrorAction SilentlyContinue
    if ($wmi) {
        $wmiStatus = switch ($wmi.PrinterStatus) {
            1 { 'Other' }; 2 { 'Unknown' }; 3 { 'Idle' }; 4 { 'Printing' }
            5 { 'Warmup' }; 6 { 'Stopped/Offline' }; 7 { 'Error' }
            default { "Code $($wmi.PrinterStatus)" }
        }
        Info "Name:           $($wmi.Name)"
        Info "WMI Status:     $wmiStatus (code $($wmi.PrinterStatus))"
        Info "Printer State:  $($wmi.PrinterState)"
        Info "Work Offline:   $($wmi.WorkOffline)"
        Info "Spool Enabled:  $($wmi.SpoolEnabled)"
        Info "Default:        $($wmi.Default)"
        Info "Shared:         $($wmi.Shared)"
        Info "Published:      $($wmi.Published)"

        if ($wmi.PrinterStatus -eq 7 -or $wmi.PrinterStatus -eq 6) {
            Fail "Printer is in ERROR/STOPPED state!"
            if ($Fix) {
                Warn "Attempting CancelAllJobs + Resume..."
                $wmi.CancelAllJobs() | Out-Null
                $wmi.Resume() | Out-Null
                Start-Sleep 1
                $wmi2 = Get-WmiObject Win32_Printer -Filter "Name='$($receiptPrinter.Name -replace "'","''")'"
                if ($wmi2.PrinterStatus -le 4) { Ok "Printer resumed!" }
                else { Fail "Still in error state after resume" }
            } else {
                Warn "Run with -Fix to attempt automatic resume"
            }
        }
        if ($wmi.WorkOffline) {
            Fail "Printer is set to WORK OFFLINE — it won't print!"
            if ($Fix) {
                Warn "Clearing offline flag..."
                $wmi.WorkOffline = $false
                $wmi.Put() | Out-Null
                Ok "Offline flag cleared"
            }
        }
    }
} else {
    Info "Skipped — no receipt printer"
}

# ── 5. STUCK PRINT JOBS ─────────────────────────────────────────────────
Section 5 "STUCK PRINT JOBS"
if ($receiptPrinter) {
    $jobs = Get-PrintJob -PrinterName $receiptPrinter.Name -ErrorAction SilentlyContinue
    if ($jobs) {
        $jobList = @($jobs)
        Warn "$($jobList.Count) jobs stuck in queue!"
        foreach ($j in $jobList) {
            Info "  Job $($j.Id): `"$($j.DocumentName)`" Status=$($j.JobStatus) Size=$($j.Size) Submitted=$($j.SubmittedTime)"
        }
        if ($Fix) {
            Warn "Clearing all stuck jobs..."
            foreach ($j in $jobList) {
                Remove-PrintJob -PrinterName $receiptPrinter.Name -ID $j.Id -ErrorAction SilentlyContinue
            }
            Ok "Jobs cleared"
        } else {
            Warn "Run with -Fix to clear stuck jobs"
        }
    } else {
        Ok "Queue is empty (no stuck jobs)"
    }
} else {
    Info "Skipped — no receipt printer"
}

# ── 6. RAW DATATYPE SUPPORT TEST ────────────────────────────────────────
Section 6 "RAW DATATYPE TEST (can this printer accept ESC/POS?)"
if ($receiptPrinter) {
    # Check driver — GDI-only drivers reject RAW
    $driver = $receiptPrinter.DriverName.ToLower()
    $gdiOnly = @('microsoft xps', 'microsoft print to pdf', 'fax', 'onenote', 'send to')
    $isGdi = $false
    foreach ($g in $gdiOnly) {
        if ($driver.Contains($g)) { $isGdi = $true; break }
    }
    $rawFriendly = @('generic', 'text only', 'epson', 'star ', 'bixolon', 'citizen', 'pos', 'thermal', 'receipt')
    $isRawOk = $false
    foreach ($r in $rawFriendly) {
        if ($driver.Contains($r)) { $isRawOk = $true; break }
    }

    if ($isGdi) {
        Fail "Driver `"$($receiptPrinter.DriverName)`" is GDI-only — it CANNOT accept RAW ESC/POS data"
        Fail "Fix: Install the Epson APD driver, or add a 'Generic / Text Only' printer queue pointing to the same port"
    } elseif ($isRawOk) {
        Ok "Driver `"$($receiptPrinter.DriverName)`" supports RAW datatype"
    } else {
        Warn "Driver `"$($receiptPrinter.DriverName)`" — unknown if it supports RAW. Test print will confirm."
    }

    # Actually test RAW open/write via P/Invoke
    Info ""
    Info "Testing P/Invoke RAW write path (same as rawprint.ps1)..."
    try {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class DiagRawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFOW {
        public string pDocName;
        public string pOutputFile;
        public string pDatatype;
    }
    [DllImport("winspool.Drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOW di);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
}
'@ -ErrorAction SilentlyContinue

        $hPrinter = [IntPtr]::Zero
        $openOk = [DiagRawPrint]::OpenPrinter($receiptPrinter.Name, [ref]$hPrinter, [IntPtr]::Zero)
        if (!$openOk) {
            $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
            $errMap = @{
                5    = 'Access denied — try running as Administrator'
                1722 = 'RPC server unavailable — Print Spooler not running'
                1801 = 'Printer name invalid — queue may have been renamed/deleted'
                3019 = 'Printer not found'
            }
            $detail = if ($errMap.ContainsKey($err)) { $errMap[$err] } else { "Google 'Win32 error $err'" }
            Fail "OpenPrinter FAILED (error $err): $detail"
        } else {
            Ok "OpenPrinter succeeded (handle: $hPrinter)"

            $di = New-Object DiagRawPrint+DOCINFOW
            $di.pDocName = 'Diagnostic Test'
            $di.pOutputFile = $null
            $di.pDatatype = 'RAW'

            $startOk = [DiagRawPrint]::StartDocPrinter($hPrinter, 1, [ref]$di)
            if (!$startOk) {
                $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
                $errMap = @{
                    1804 = "Datatype 'RAW' not supported — driver rejects raw data. INSTALL EPSON APD OR GENERIC/TEXT DRIVER"
                    5    = 'Access denied — another process may have exclusive lock'
                }
                $detail = if ($errMap.ContainsKey($err)) { $errMap[$err] } else { "Google 'Win32 error $err'" }
                Fail "StartDocPrinter FAILED (error $err): $detail"
            } else {
                Ok "StartDocPrinter succeeded (RAW datatype accepted!)"

                $pageOk = [DiagRawPrint]::StartPagePrinter($hPrinter)
                if ($pageOk) {
                    Ok "StartPagePrinter succeeded"

                    if ($TestPrint) {
                        # Send actual test receipt
                        $escInit   = [byte[]]@(0x1B, 0x40)
                        $codepage  = [byte[]]@(0x1B, 0x74, 0x00)
                        $center    = [byte[]]@(0x1B, 0x61, 0x01)
                        $boldOn    = [byte[]]@(0x1B, 0x45, 0x01)
                        $boldOff   = [byte[]]@(0x1B, 0x45, 0x00)
                        $dblSize   = [byte[]]@(0x1D, 0x21, 0x11)
                        $normSize  = [byte[]]@(0x1D, 0x21, 0x00)
                        $left      = [byte[]]@(0x1B, 0x61, 0x00)
                        $feed      = [byte[]]@(0x1B, 0x64, 0x04)
                        $cut       = [byte[]]@(0x1D, 0x56, 0x01)

                        $text1 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("DIAGNOSTIC TEST`n")
                        $text2 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("`n$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')`n")
                        $text3 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("Register: $env:COMPUTERNAME`n")
                        $text4 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("Printer:  $($receiptPrinter.Name)`n")
                        $sep   = [System.Text.Encoding]::GetEncoding(28591).GetBytes(('-' * 42) + "`n")
                        $text5 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("Bananas              x2     `$3.50`n")
                        $text6 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("Milk 2L                     `$4.00`n")
                        $text7 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("TOTAL: `$7.50`n")
                        $text8 = [System.Text.Encoding]::GetEncoding(28591).GetBytes("`nIf you see this, printing works!`n")

                        # Build buffer
                        $ms = New-Object System.IO.MemoryStream
                        foreach ($chunk in @($escInit, $codepage, $center, $boldOn, $dblSize, $text1,
                                             $normSize, $boldOff, $text2, $text3, $text4, $left, $sep,
                                             $text5, $text6, $sep, $boldOn, $text7, $boldOff,
                                             $center, $text8, $feed, $cut)) {
                            $ms.Write($chunk, 0, $chunk.Length)
                        }
                        $data = $ms.ToArray()
                        $ms.Close()

                        $pBuf = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($data.Length)
                        [System.Runtime.InteropServices.Marshal]::Copy($data, 0, $pBuf, $data.Length)
                        $written = 0
                        $writeOk = [DiagRawPrint]::WritePrinter($hPrinter, $pBuf, $data.Length, [ref]$written)
                        [System.Runtime.InteropServices.Marshal]::FreeHGlobal($pBuf)

                        if ($writeOk -and $written -eq $data.Length) {
                            Ok "WritePrinter: $written/$($data.Length) bytes sent — CHECK IF RECEIPT PRINTED!"
                        } elseif ($writeOk) {
                            Warn "WritePrinter partial: $written/$($data.Length) bytes"
                        } else {
                            $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
                            Fail "WritePrinter FAILED (error $err)"
                        }
                    } else {
                        Info "Skipping actual write (use -TestPrint to send test receipt)"
                    }

                    [DiagRawPrint]::EndPagePrinter($hPrinter) | Out-Null
                } else {
                    Fail "StartPagePrinter FAILED (error $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
                }
                [DiagRawPrint]::EndDocPrinter($hPrinter) | Out-Null
            }
            [DiagRawPrint]::ClosePrinter($hPrinter) | Out-Null
        }
    } catch {
        Fail "P/Invoke test exception: $($_.Exception.Message)"
    }
}

# ── 7. CASH DRAWER KICK TEST ────────────────────────────────────────────
Section 7 "CASH DRAWER TEST"
if ($receiptPrinter -and $TestDrawer) {
    Info "Sending drawer kick via printer DK port..."
    try {
        $hPrinter = [IntPtr]::Zero
        $openOk = [DiagRawPrint]::OpenPrinter($receiptPrinter.Name, [ref]$hPrinter, [IntPtr]::Zero)
        if ($openOk) {
            $di = New-Object DiagRawPrint+DOCINFOW
            $di.pDocName = 'Drawer Kick'
            $di.pOutputFile = $null
            $di.pDatatype = 'RAW'
            [DiagRawPrint]::StartDocPrinter($hPrinter, 1, [ref]$di) | Out-Null
            [DiagRawPrint]::StartPagePrinter($hPrinter) | Out-Null

            # ESC @ (init) + ESC p 0 55 121 (pin 2) + ESC p 1 55 121 (pin 5)
            $data = [byte[]]@(0x1B, 0x40, 0x1B, 0x70, 0x00, 0x37, 0x79, 0x1B, 0x70, 0x01, 0x37, 0x79)
            $pBuf = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($data.Length)
            [System.Runtime.InteropServices.Marshal]::Copy($data, 0, $pBuf, $data.Length)
            $written = 0
            $writeOk = [DiagRawPrint]::WritePrinter($hPrinter, $pBuf, $data.Length, [ref]$written)
            [System.Runtime.InteropServices.Marshal]::FreeHGlobal($pBuf)

            [DiagRawPrint]::EndPagePrinter($hPrinter) | Out-Null
            [DiagRawPrint]::EndDocPrinter($hPrinter) | Out-Null
            [DiagRawPrint]::ClosePrinter($hPrinter) | Out-Null

            if ($writeOk) { Ok "Drawer kick sent — DID IT OPEN?" }
            else { Fail "WritePrinter failed for drawer kick" }
        } else {
            Fail "Could not open printer for drawer kick"
        }
    } catch {
        Fail "Drawer kick exception: $($_.Exception.Message)"
    }
} elseif ($receiptPrinter) {
    Info "Skipped (use -TestDrawer to send drawer kick)"
} else {
    Info "Skipped — no receipt printer"
}

# ── 8. PROCESSES THAT LOCK PRINTERS/PORTS ────────────────────────────────
Section 8 "COMPETING PROCESSES (things that grab the printer)"
$suspects = @(
    @{ Name = 'EpsonStatusAgent*'; Desc = 'Epson Status Monitor — HOLDS USB PORT OPEN, blocks other apps' },
    @{ Name = 'STMON*';           Desc = 'Epson Status Monitor (legacy name)' },
    @{ Name = 'EEventManager*';   Desc = 'Epson Event Manager' },
    @{ Name = 'crisp*';           Desc = 'Another Crisp POS instance (stale?)' },
    @{ Name = 'electron*';        Desc = 'Electron app (could be stale POS instance)' },
    @{ Name = 'node*';            Desc = 'Node.js process (could be stale POS backend)' },
    @{ Name = 'StarPrint*';       Desc = 'Star Micronics print monitor' },
    @{ Name = 'BxlConfigTool*';   Desc = 'Bixolon config tool' },
    @{ Name = 'EPSON*';           Desc = 'Any Epson background process' }
)
$foundSuspect = $false
foreach ($s in $suspects) {
    $procs = Get-Process -Name $s.Name -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            Warn "$($p.ProcessName) (PID $($p.Id)) — $($s.Desc)"
            $foundSuspect = $true
        }
    }
}
if (!$foundSuspect) {
    Ok "No known printer-locking processes found"
} else {
    Warn "These processes can hold the printer port exclusively!"
    if ($Fix) {
        Warn "Stopping suspect processes..."
        foreach ($s in $suspects) {
            Stop-Process -Name $s.Name -Force -ErrorAction SilentlyContinue
        }
        Ok "Stopped. Re-run diagnostic to verify."
    } else {
        Warn "Run with -Fix to kill them, or close them manually"
    }
}

# ── 9. USB POWER MANAGEMENT (selective suspend) ─────────────────────────
Section 9 "USB POWER MANAGEMENT"
Info "Checking USB selective suspend..."
try {
    # Check power plan setting
    $plan = powercfg /query SCHEME_CURRENT 2381b4fe-1620-4f92-89a3-71e7c1b9a2c7 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 2>&1
    $planStr = $plan -join "`n"
    if ($planStr -match 'Current AC Power Setting Index:\s*0x0+1') {
        Warn "USB selective suspend is ENABLED (AC power)"
        Warn "This can cause the printer/scale to lose power and stop responding"
        if ($Fix) {
            Warn "Disabling USB selective suspend..."
            powercfg /setacvalueindex SCHEME_CURRENT 2381b4fe-1620-4f92-89a3-71e7c1b9a2c7 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
            powercfg /setactive SCHEME_CURRENT
            Ok "Disabled USB selective suspend on AC power"
        }
    } elseif ($planStr -match 'Current AC Power Setting Index:\s*0x0+0') {
        Ok "USB selective suspend is DISABLED (AC power) — good"
    } else {
        Info "Could not determine USB selective suspend state"
    }
} catch {
    Info "Could not check USB power settings: $($_.Exception.Message)"
}

# Check individual USB hub power settings
Info ""
Info "USB Hub power management:"
$usbHubs = Get-CimInstance -ClassName Win32_USBHub -ErrorAction SilentlyContinue
$hubCount = 0
$usbControllers = Get-PnpDevice -Class USB -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -like '*Hub*' -or $_.FriendlyName -like '*Host Controller*' }
if ($usbControllers) {
    foreach ($dev in $usbControllers) {
        $hubCount++
        # Check if power management is enabled via registry
        $instanceId = $dev.InstanceId -replace '\\', '\\'
        $regPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($dev.InstanceId)\Device Parameters"
        $pmEnabled = (Get-ItemProperty -Path $regPath -Name 'EnhancedPowerManagementEnabled' -ErrorAction SilentlyContinue).EnhancedPowerManagementEnabled
        if ($pmEnabled -eq 1) {
            Warn "$($dev.FriendlyName) — power management ENABLED (can suspend devices)"
        } else {
            Info "$($dev.FriendlyName) — power management disabled (ok)"
        }
    }
} else {
    Info "Could not enumerate USB hubs"
}

# ── 10. USB DEVICES (Epson, Mettler Toledo, scanners) ────────────────────
Section 10 "USB DEVICES"
$pnpDevices = Get-PnpDevice -Status OK -ErrorAction SilentlyContinue | Where-Object {
    $_.InstanceId -match 'USB\\VID_'
}
$knownVids = @{
    '04B8' = 'EPSON (printer)'
    '0519' = 'Star Micronics (printer)'
    '0416' = 'Winbond (printer chip)'
    '1504' = 'Bixolon (printer)'
    '2730' = 'Citizen (printer)'
    '0EB8' = 'Mettler Toledo (scale)'
    '0B67' = 'Fairbanks (scale)'
    '0922' = 'Dymo (scale)'
    '2474' = 'CAS (scale)'
    '05E0' = 'Symbol/Zebra (scanner)'
    '0C2E' = 'Honeywell (scanner)'
    '05F9' = 'PSC/Datalogic (scanner)'
    '1EAB' = 'Zebex (scanner)'
    '1A86' = 'QinHeng/CH340 (USB-serial adapter)'
    '0403' = 'FTDI (USB-serial adapter)'
    '10C4' = 'Silicon Labs (USB-serial adapter)'
    '067B' = 'Prolific (USB-serial adapter)'
}

if ($pnpDevices) {
    foreach ($d in $pnpDevices) {
        $vid = ''
        $pid = ''
        if ($d.InstanceId -match 'VID_([0-9A-Fa-f]{4})') { $vid = $Matches[1].ToUpper() }
        if ($d.InstanceId -match 'PID_([0-9A-Fa-f]{4})') { $pid = $Matches[1].ToUpper() }
        $known = if ($knownVids.ContainsKey($vid)) { " <<< $($knownVids[$vid])" } else { '' }
        if ($known -or $vid) {
            $color = if ($known) { 'White' } else { 'Gray' }
            Write-Host "  VID:$vid PID:$pid — $($d.FriendlyName)$known" -ForegroundColor $color
        }
    }
} else {
    Info "Could not enumerate USB devices"
}

# ── 11. SERIAL PORTS (for scales) ───────────────────────────────────────
Section 11 "SERIAL / COM PORTS"
$comPorts = Get-PnpDevice -Class Ports -Status OK -ErrorAction SilentlyContinue
if ($comPorts) {
    foreach ($p in $comPorts) {
        $comNum = if ($p.FriendlyName -match '\((COM\d+)\)') { $Matches[1] } else { '?' }
        Info "$comNum — $($p.FriendlyName)"
        Info "    Device: $($p.InstanceId)"
    }
} else {
    Info "No COM ports found"
}

# Also check registry
Info ""
Info "Registry COM port map:"
try {
    $regPorts = Get-ItemProperty 'HKLM:\HARDWARE\DEVICEMAP\SERIALCOMM' -ErrorAction Stop
    $regPorts.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
        Info "  $($_.Name) -> $($_.Value)"
    }
} catch {
    Info "  No registry COM port entries"
}

# Test if COM ports are accessible (not locked by another process)
Info ""
Info "COM port lock test:"
$comPortNames = @()
if ($comPorts) {
    foreach ($p in $comPorts) {
        if ($p.FriendlyName -match '\((COM\d+)\)') { $comPortNames += $Matches[1] }
    }
}
foreach ($port in $comPortNames) {
    try {
        $sp = New-Object System.IO.Ports.SerialPort $port, 9600
        $sp.Open()
        $sp.Close()
        Ok "$port — accessible (not locked)"
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match 'Access.*denied|in use') {
            Fail "$port — LOCKED by another process!"
        } else {
            Warn "$port — error: $($msg.Substring(0, [Math]::Min(80, $msg.Length)))"
        }
    }
}

# ── 12. RAWPRINT.PS1 PRESENCE & INTEGRITY ────────────────────────────────
Section 12 "RAWPRINT.PS1 CHECK"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rawprintPath = Join-Path $scriptDir 'rawprint.ps1'
if (Test-Path $rawprintPath) {
    $info = Get-Item $rawprintPath
    Ok "rawprint.ps1 found ($($info.Length) bytes, modified $($info.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"
    # Quick syntax check
    $content = Get-Content $rawprintPath -Raw
    if ($content -match 'winspool\.Drv' -and $content -match 'WritePrinter' -and $content -match 'OpenPrinter') {
        Ok "Contains expected P/Invoke signatures"
    } else {
        Warn "rawprint.ps1 may be corrupted — missing expected P/Invoke calls"
    }
} else {
    Fail "rawprint.ps1 NOT FOUND at $rawprintPath"
    Fail "The POS app needs this file to print receipts!"
}

# ── 13. NODE.JS / ELECTRON CHECK ─────────────────────────────────────────
Section 13 "NODE.JS & ELECTRON"
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if ($nodePath) {
    $nodeVer = & node --version 2>&1
    Ok "Node.js: $nodeVer at $($nodePath.Source)"
} else {
    Warn "Node.js not in PATH"
}

$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if ($npmPath) {
    $npmVer = & npm --version 2>&1
    Ok "npm: v$npmVer"
}

# Check if node_modules exists
$nmPath = Join-Path $scriptDir 'node_modules'
if (Test-Path $nmPath) {
    $nmSize = (Get-ChildItem $nmPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $nmSizeMB = [math]::Round($nmSize / 1MB, 1)
    Ok "node_modules exists ($nmSizeMB MB)"

    # Check critical native modules
    $criticalModules = @('node-hid', 'serialport', 'sql.js')
    foreach ($mod in $criticalModules) {
        $modPath = Join-Path $nmPath $mod
        if (Test-Path $modPath) {
            Ok "  $mod — installed"
        } else {
            Warn "  $mod — MISSING (run npm install)"
        }
    }
} else {
    Fail "node_modules not found — run 'npm install' first!"
}

# ── 14. WINDOWS DEFENDER / ANTIVIRUS ─────────────────────────────────────
Section 14 "ANTIVIRUS & SECURITY"
# Check if Windows Defender is blocking PowerShell
try {
    $avProducts = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop
    foreach ($av in $avProducts) {
        Info "AV: $($av.displayName) (state: $($av.productState))"
    }
} catch {
    Info "Could not query AV products (may need admin)"
}

# Check if there are ASR (Attack Surface Reduction) rules blocking scripts
try {
    $asrRules = Get-MpPreference -ErrorAction Stop
    if ($asrRules.AttackSurfaceReductionRules_Ids) {
        Warn "Attack Surface Reduction rules are active — may block PowerShell scripts"
        foreach ($rule in $asrRules.AttackSurfaceReductionRules_Ids) {
            Info "  ASR Rule: $rule"
        }
    } else {
        Ok "No ASR rules blocking scripts"
    }
    # Check exclusions
    $exclusions = $asrRules.ExclusionPath
    if ($exclusions) {
        Info "Defender exclusion paths: $($exclusions -join ', ')"
    }
} catch {
    Info "Could not check Defender settings (may need admin)"
}

# ── SUMMARY ──────────────────────────────────────────────────────────────
Write-Host "`n$divider" -ForegroundColor White
Write-Host "  SUMMARY" -ForegroundColor White
Write-Host $divider -ForegroundColor White
Write-Host ""
Write-Host "  Run this on BOTH registers and compare." -ForegroundColor Gray
Write-Host "  Look for [FAIL] and [!!] lines — those are the differences." -ForegroundColor Gray
Write-Host ""
Write-Host "  Quick fixes to try:" -ForegroundColor Gray
Write-Host "    diagnose4.ps1 -Fix              Auto-fix what we can" -ForegroundColor Gray
Write-Host "    diagnose4.ps1 -TestPrint         Send test receipt" -ForegroundColor Gray
Write-Host "    diagnose4.ps1 -TestDrawer         Open cash drawer" -ForegroundColor Gray
Write-Host "    diagnose4.ps1 -Fix -TestPrint    Fix + print" -ForegroundColor Gray
Write-Host ""
Write-Host "  Common fixes:" -ForegroundColor Gray
Write-Host "    1. Stuck queue     -> -Fix clears jobs and resumes" -ForegroundColor Gray
Write-Host "    2. Wrong driver    -> Install Epson APD or 'Generic / Text Only'" -ForegroundColor Gray
Write-Host "    3. Port locked     -> Kill Epson Status Monitor (-Fix does this)" -ForegroundColor Gray
Write-Host "    4. USB suspended   -> -Fix disables selective suspend" -ForegroundColor Gray
Write-Host "    5. COM port moved  -> Re-probe in Admin > Hardware tab" -ForegroundColor Gray
Write-Host ""
Write-Host "  Copy ALL output above and paste it back for analysis." -ForegroundColor Yellow
Write-Host $divider -ForegroundColor White
