# diagnose-hardware.ps1 -- Foolproof hardware diagnostic for Crisp POS registers
# Run: powershell -ExecutionPolicy Bypass -File diagnose-hardware.ps1
# Saves full report to Desktop automatically

$ErrorActionPreference = 'SilentlyContinue'
$report = @()
$fixes = @()
$printerFound = $false
$printerQueue = ''
$scalePort = ''

function Log($msg, $color) {
    Write-Host $msg -ForegroundColor ($color ?? 'White')
    $script:report += $msg
}
function Pass($msg) { Log "  [PASS] $msg" 'Green' }
function Fail($msg) { Log "  [FAIL] $msg" 'Red' }
function Warn($msg) { Log "  [WARN] $msg" 'Yellow' }
function Info($msg) { Log "  [INFO] $msg" 'Cyan' }
function Fix($msg)  { $script:fixes += $msg }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   CRISP POS -- Hardware Diagnostic" -ForegroundColor Cyan
Write-Host "   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "   Computer: $env:COMPUTERNAME" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. PRINT SPOOLER SERVICE
# ============================================================
Log "`n--- 1. PRINT SPOOLER SERVICE ---" 'Yellow'

$spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
if ($spooler) {
    if ($spooler.Status -eq 'Running') {
        Pass "Print Spooler service is running"
    } else {
        Fail "Print Spooler service is $($spooler.Status)"
        Fix "Run as admin: Start-Service Spooler"
        Log "  Attempting to start..." 'Yellow'
        try { Start-Service Spooler -ErrorAction Stop; Pass "Spooler started successfully" }
        catch { Fail "Could not start spooler (need admin): $_" }
    }
} else {
    Fail "Print Spooler service not found!"
}

# ============================================================
# 2. USB DEVICES -- FIND EPSON + SCALE ADAPTER
# ============================================================
Log "`n--- 2. USB DEVICES ---" 'Yellow'

$usbDevices = @()
try {
    $pnp = Get-PnpDevice -Class 'USB','Printer','Ports','PrintQueue' -Status OK -ErrorAction SilentlyContinue
    foreach ($d in $pnp) {
        $vid = if ($d.InstanceId -match 'VID_([0-9A-F]{4})') { $Matches[1] } else { '' }
        $pid = if ($d.InstanceId -match 'PID_([0-9A-F]{4})') { $Matches[1] } else { '' }
        if ($vid) {
            $usbDevices += [PSCustomObject]@{
                Name = $d.FriendlyName
                VID = $vid
                PID = $pid
                Class = $d.Class
                InstanceId = $d.InstanceId
            }
        }
    }
} catch {
    Warn "PnP enumeration failed, trying WMI fallback"
    try {
        $wmi = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.DeviceID -match 'VID_' }
        foreach ($d in $wmi) {
            $vid = if ($d.DeviceID -match 'VID_([0-9A-F]{4})') { $Matches[1] } else { '' }
            $pid = if ($d.DeviceID -match 'PID_([0-9A-F]{4})') { $Matches[1] } else { '' }
            $usbDevices += [PSCustomObject]@{ Name = $d.Name; VID = $vid; PID = $pid; Class = $d.PNPClass; InstanceId = $d.DeviceID }
        }
    } catch { Fail "USB enumeration completely failed" }
}

if ($usbDevices.Count -eq 0) {
    Fail "No USB devices found at all!"
} else {
    Info "$($usbDevices.Count) USB device(s) found"
    $epsonVids = @('04B8')
    $scaleVids = @('0EB8','0B67','0922','1446')
    $adapterVids = @('0403','067B','1A86','10C4')
    $scannerVids = @('05E0','0C2E','05F9','1EAB','2DD6')

    foreach ($d in $usbDevices) {
        $label = "  $($d.Name) [VID:$($d.VID) PID:$($d.PID)] ($($d.Class))"
        if ($epsonVids -contains $d.VID) {
            Log $label 'Green'
            Pass "EPSON device found! (VID $($d.VID):$($d.PID))"
            # Check specific Epson model
            $epsonModels = @{
                '0E11' = 'TM-T82'; '0E14' = 'TM-T82II'; '0E32' = 'TM-T82III'
                '0E03' = 'TM-T20'; '0E15' = 'TM-T20II'; '0E20' = 'TM-T20III'
                '0202' = 'TM-T88IV/V'; '0E28' = 'TM-T88VI'
            }
            if ($epsonModels[$d.PID]) { Info "  Model: $($epsonModels[$d.PID])" }
        } elseif ($adapterVids -contains $d.VID) {
            Log $label 'Cyan'
            Info "Serial adapter (likely scale connection)"
        } elseif ($scaleVids -contains $d.VID) {
            Log $label 'Cyan'
            Info "Scale device"
        } elseif ($scannerVids -contains $d.VID) {
            Log $label 'Cyan'
            Info "Scanner device"
        } else {
            Log "  $($d.Name) [VID:$($d.VID) PID:$($d.PID)]" 'Gray'
        }
    }

    $hasEpson = $usbDevices | Where-Object { $epsonVids -contains $_.VID }
    if (-not $hasEpson) {
        Fail "No Epson USB device detected -- is the printer plugged in and powered on?"
        Fix "Check USB cable from printer to PC. Try a different USB port. Make sure printer is ON."
    }
}

# ============================================================
# 3. PRINTER QUEUES -- THE CRITICAL PART
# ============================================================
Log "`n--- 3. WINDOWS PRINTER QUEUES ---" 'Yellow'

$queues = @()
try {
    $queues = Get-Printer -ErrorAction Stop
} catch {
    Fail "Get-Printer failed: $_"
    Fix "Print spooler may be broken. Try: Restart-Service Spooler"
}

if ($queues.Count -eq 0) {
    Fail "NO printer queues found at all!"
    Fix "Install the Epson APD (Advanced Printer Driver) from https://download.ebz.epson.net/dsc/search/01/search/?OSC=WS64-1"
} else {
    Info "$($queues.Count) printer queue(s) found:`n"

    $receiptKeywords = @('epson','tm-t','tm-u','tm-m','thermal','receipt','pos','80mm','58mm','generic')
    $virtualKeywords = @('xps','pdf','fax','onenote','send to','microsoft')

    $queueNum = 0
    foreach ($q in $queues) {
        $queueNum++
        $name = $q.Name
        $port = $q.PortName
        $driver = $q.DriverName
        $status = $q.PrinterStatus
        $nameLower = $name.ToLower()
        $driverLower = ($driver ?? '').ToLower()

        $isReceipt = $receiptKeywords | Where-Object { $nameLower.Contains($_) -or $driverLower.Contains($_) }
        $isVirtual = $virtualKeywords | Where-Object { $nameLower.Contains($_) }

        $statusText = switch ($status) {
            0 { 'Normal' }; 1 { 'Paused' }; 2 { 'Error' }
            3 { 'Pending Deletion' }; 4 { 'Paper Jam' }; 5 { 'Paper Out' }
            6 { 'Manual Feed' }; 7 { 'Paper Problem' }; 8 { 'Offline' }
            default { "Unknown ($status)" }
        }

        $color = if ($isReceipt -and -not $isVirtual) { 'Green' } elseif ($isVirtual) { 'DarkGray' } else { 'White' }

        Log "  [$queueNum] $name" $color
        Log "      Port: $port | Driver: $driver | Status: $statusText" 'Gray'

        # Check for stuck jobs
        try {
            $jobs = Get-PrintJob -PrinterName $name -ErrorAction SilentlyContinue
            if ($jobs -and $jobs.Count -gt 0) {
                Warn "    $($jobs.Count) stuck job(s) in queue!"
                Log "      Clearing stuck jobs..." 'Yellow'
                $jobs | Remove-PrintJob -ErrorAction SilentlyContinue
                Pass "    Jobs cleared"
            }
        } catch {}

        if ($isReceipt -and -not $isVirtual) {
            Info "    ^^^ This looks like a receipt printer!"

            if ($status -eq 1) {
                Warn "    Queue is PAUSED"
                Log "      Resuming..." 'Yellow'
                try {
                    $wmiPrinter = Get-WmiObject Win32_Printer -Filter "Name='$($name.Replace("'","''"))'" -ErrorAction SilentlyContinue
                    if ($wmiPrinter) { $wmiPrinter.Resume() | Out-Null; Pass "    Queue resumed" }
                } catch { Fail "    Could not resume: $_" }
            }
            if ($status -eq 2 -or $status -eq 8) {
                Warn "    Queue is in ERROR/OFFLINE state"
                Log "      Attempting WMI resume + clear..." 'Yellow'
                try {
                    $wmiPrinter = Get-WmiObject Win32_Printer -Filter "Name='$($name.Replace("'","''"))'" -ErrorAction SilentlyContinue
                    if ($wmiPrinter) { $wmiPrinter.CancelAllJobs() | Out-Null; $wmiPrinter.Resume() | Out-Null; Pass "    Reset attempted" }
                } catch {}
                Fix "Power-cycle the printer (turn off, wait 5 sec, turn on), then re-run this script"
            }
        }
    }
}

# ============================================================
# 4. RAW PRINT TEST -- TRY EVERY CANDIDATE QUEUE
# ============================================================
Log "`n--- 4. RAW PRINT TEST ---" 'Yellow'
Info "Testing each candidate queue with ESC/POS raw bytes..."
Info "(A test receipt will print from the working queue)`n"

# Build P/Invoke type for raw printing
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

    public static string SendRaw(string printerName, byte[] data) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            return "FAIL:OpenPrinter error " + Marshal.GetLastWin32Error() + " -- queue '" + printerName + "' not accessible";
        }
        var di = new DOCINFOW { pDocName = "Crisp Diagnostic", pOutputFile = null, pDatatype = "RAW" };
        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return "FAIL:StartDocPrinter error " + err;
        }
        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return "FAIL:StartPagePrinter error " + err;
        }
        IntPtr pBuf = Marshal.AllocHGlobal(data.Length);
        Marshal.Copy(data, 0, pBuf, data.Length);
        int written;
        bool writeOk = WritePrinter(hPrinter, pBuf, data.Length, out written);
        int writeErr = Marshal.GetLastWin32Error();
        Marshal.FreeHGlobal(pBuf);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        if (!writeOk) return "FAIL:WritePrinter error " + writeErr;
        if (written != data.Length) return "FAIL:WritePrinter wrote " + written + "/" + data.Length;
        return "OK:" + written + " bytes sent";
    }
}
'@

# ESC/POS bytes for a visible test receipt
$ESC = 0x1B; $GS = 0x1D
$initBytes = @($ESC, 0x40)
$codepage = @($ESC, 0x74, 0x00)
$centerOn = @($ESC, 0x61, 0x01)
$leftAlign = @($ESC, 0x61, 0x00)
$boldOn = @($ESC, 0x45, 0x01)
$boldOff = @($ESC, 0x45, 0x00)
$doubleSize = @($GS, 0x21, 0x11)
$normalSize = @($GS, 0x21, 0x00)
$feed3 = @($ESC, 0x64, 0x03)
$partialCut = @($GS, 0x56, 0x01)
$drawerKick = @($ESC, 0x70, 0x00, 0x37, 0x79)

function TextBytes($s) { [System.Text.Encoding]::GetEncoding(437).GetBytes("$s`n") }

$testReceipt = [byte[]](@() `
    + $initBytes + $codepage + $centerOn + $boldOn + $doubleSize `
    + (TextBytes "CRISP POS") `
    + $normalSize + $boldOff `
    + (TextBytes "Hardware Diagnostic") `
    + (TextBytes "========================") `
    + $leftAlign `
    + (TextBytes "Computer: $env:COMPUTERNAME") `
    + (TextBytes "Date: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')") `
    + (TextBytes "========================") `
    + $centerOn + $boldOn `
    + (TextBytes "PRINTER IS WORKING!") `
    + $boldOff `
    + (TextBytes "") `
    + (TextBytes "Use this queue name in") `
    + (TextBytes "Crisp POS Hardware tab") `
    + $feed3 + $partialCut `
)

# Also build a drawer-kick-only payload
$drawerOnly = [byte[]](@() + $initBytes + $drawerKick)

# Test candidates: receipt-looking queues first, then all others (skip virtual)
$candidates = @()
$virtualKeywords = @('xps','pdf','fax','onenote','send to','microsoft')
foreach ($q in $queues) {
    $nameLower = $q.Name.ToLower()
    $isVirtual = $virtualKeywords | Where-Object { $nameLower.Contains($_) }
    if (-not $isVirtual) { $candidates += $q }
}

# Sort: receipt-keyword matches first
$receiptKeywords = @('epson','tm-t','tm-u','tm-m','thermal','receipt','pos','80mm','58mm')
$candidates = $candidates | Sort-Object {
    $n = $_.Name.ToLower(); $d = ($_.DriverName ?? '').ToLower()
    $isReceipt = $receiptKeywords | Where-Object { $n.Contains($_) -or $d.Contains($_) }
    if ($isReceipt) { 0 } else { 1 }
}

$workingQueues = @()
$queueIdx = 0
foreach ($q in $candidates) {
    $queueIdx++
    $name = $q.Name
    Log "  Testing [$queueIdx/$($candidates.Count)]: `"$name`"..." 'White'

    # First: try a silent init (just ESC @ -- resets printer, doesn't print anything visible)
    $silentResult = [DiagRawPrint]::SendRaw($name, [byte[]]$initBytes)

    if ($silentResult.StartsWith("OK")) {
        Pass "    Raw send accepted by spooler"

        # Check if a job got stuck (means printer is offline/errored)
        Start-Sleep -Milliseconds 500
        $stuckJobs = Get-PrintJob -PrinterName $name -ErrorAction SilentlyContinue
        if ($stuckJobs -and $stuckJobs.Count -gt 0) {
            Warn "    Job stuck in queue (printer offline or wrong queue)"
            $stuckJobs | Remove-PrintJob -ErrorAction SilentlyContinue
        } else {
            Pass "    No stuck jobs -- printer consumed the data!"
            $workingQueues += $name

            # Send a real test receipt
            Log "    Sending test receipt..." 'Cyan'
            $printResult = [DiagRawPrint]::SendRaw($name, $testReceipt)
            if ($printResult.StartsWith("OK")) {
                Pass "    TEST RECEIPT SENT -- check printer for output!"
            } else {
                Warn "    Receipt send result: $printResult"
            }

            # Test drawer kick
            Log "    Sending drawer kick..." 'Cyan'
            $drawerResult = [DiagRawPrint]::SendRaw($name, $drawerOnly)
            if ($drawerResult.StartsWith("OK")) {
                Pass "    DRAWER KICK SENT -- did the drawer open?"
            } else {
                Warn "    Drawer kick result: $drawerResult"
            }
        }
    } else {
        Fail "    $silentResult"
    }
    Log "" 'White'
}

if ($workingQueues.Count -gt 0) {
    $script:printerFound = $true
    $script:printerQueue = $workingQueues[0]
    Log "  WORKING QUEUE(S): $($workingQueues -join ', ')" 'Green'
} else {
    Fail "  NO working printer queue found!"
    Fix "1. Make sure printer is ON and USB cable is connected"
    Fix "2. Install Epson APD driver if not installed"
    Fix "3. Check Device Manager for any USB errors"
}

# ============================================================
# 5. COM PORTS + SCALE TEST
# ============================================================
Log "`n--- 5. SERIAL PORTS + SCALE ---" 'Yellow'

$comPorts = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object
if ($comPorts.Count -eq 0) {
    Warn "No COM ports found (scale uses RS-232 via USB adapter)"
    Fix "Check USB-to-Serial adapter is plugged in and shows in Device Manager > Ports"
} else {
    Info "$($comPorts.Count) COM port(s): $($comPorts -join ', ')"

    foreach ($p in $comPorts) {
        Log "`n  Testing $p (MT 8217: 9600 baud, 7-E-1)..." 'White'
        try {
            $serial = New-Object System.IO.Ports.SerialPort $p, 9600, ([System.IO.Ports.Parity]::Even), 7, ([System.IO.Ports.StopBits]::One)
            $serial.ReadTimeout = 2000
            $serial.WriteTimeout = 2000
            $serial.DtrEnable = $true
            $serial.RtsEnable = $true
            $serial.Open()
            Pass "    Port opened"

            # Send 'W' (weight request)
            if ($serial.BytesToRead -gt 0) { $serial.DiscardInBuffer() }
            $serial.Write("W")
            Start-Sleep -Milliseconds 500

            $rawBytes = @()
            $gotSTX = $false
            $frameBytes = @()
            $deadline = (Get-Date).AddSeconds(2)

            while ((Get-Date) -lt $deadline) {
                if ($serial.BytesToRead -gt 0) {
                    $b = $serial.ReadByte()
                    $rawBytes += $b
                    if ($b -eq 0x02) { $gotSTX = $true; $frameBytes = @(); continue }
                    if ($gotSTX) {
                        if ($b -eq 0x0D) { break }
                        $frameBytes += $b
                    }
                } else { Start-Sleep -Milliseconds 50 }
            }

            $serial.Close()
            $serial.Dispose()

            if ($rawBytes.Count -eq 0) {
                Warn "    No response (not a scale, or scale is off)"
            } else {
                $hexStr = ($rawBytes | ForEach-Object { $_.ToString("X2") }) -join " "
                $asciiStr = -join ($rawBytes | ForEach-Object { if ($_ -ge 0x20 -and $_ -le 0x7E) { [char]$_ } else { "?" } })
                Info "    Response: $($rawBytes.Count) bytes"
                Info "    Hex:   $hexStr"
                Info "    ASCII: $asciiStr"

                if ($gotSTX -and $frameBytes.Count -gt 0) {
                    $frameStr = -join ($frameBytes | ForEach-Object { [char]$_ })
                    if ($frameStr -match "^-?\d+\.?\d*$") {
                        $weight = [double]$frameStr
                        Pass "    SCALE FOUND! Weight: $weight kg"
                        $script:scalePort = $p
                    } elseif ($frameStr -match "^\?") {
                        Pass "    SCALE FOUND! (status: $frameStr -- scale in motion or zeroing)"
                        $script:scalePort = $p
                    } else {
                        Info "    Frame data: $frameStr (may be scale with different format)"
                        $script:scalePort = $p
                    }
                } else {
                    Warn "    Got bytes but no STX frame -- may not be MT 8217 protocol"
                }
            }
        } catch {
            $errMsg = $_.Exception.Message
            if ($errMsg -match 'Access|denied|use') {
                Warn "    Port in use (Crisp POS or another app has it open)"
                Info "    If Crisp POS is running and showing weight, this is expected"
                # If the POS is running and has the port, it's probably the scale
                $script:scalePort = $p
            } elseif ($errMsg -match 'not exist|not found') {
                Fail "    Port does not exist"
            } else {
                Fail "    Error: $errMsg"
            }
        }
    }
}

# ============================================================
# 6. CONFLICTING PROCESSES
# ============================================================
Log "`n--- 6. CONFLICTING PROCESSES ---" 'Yellow'

$conflicts = @{
    'profittrack' = 'Profit Track (locks COM ports + printer queues!)'
    'pt_pos' = 'Profit Track POS'
    'ptserver' = 'Profit Track Server'
    'ptrack' = 'Profit Track'
    'putty' = 'PuTTY (holds COM ports open)'
    'realterm' = 'RealTerm'
    'teraterm' = 'Tera Term'
}

$foundConflicts = @()
try {
    $procs = Get-Process -ErrorAction SilentlyContinue | Select-Object -Property ProcessName -Unique
    foreach ($proc in $procs) {
        $pname = $proc.ProcessName.ToLower()
        foreach ($key in $conflicts.Keys) {
            if ($pname.Contains($key)) {
                $foundConflicts += $conflicts[$key]
                Fail "$($conflicts[$key]) is RUNNING!"
                Fix "Close $($conflicts[$key]) before running Crisp POS"
            }
        }
    }
} catch {}

if ($foundConflicts.Count -eq 0) {
    Pass "No conflicting processes found"
}

# ============================================================
# 7. CRISP POS DATABASE -- CHECK SAVED CONFIG
# ============================================================
Log "`n--- 7. CRISP POS SAVED CONFIG ---" 'Yellow'

$dbPath = Join-Path $env:APPDATA "crisp-pos\crisp-pos.sqlite"
if (Test-Path $dbPath) {
    Info "Database found: $dbPath"
    Info "Size: $([math]::Round((Get-Item $dbPath).Length / 1024, 1)) KB"
} else {
    # Try alternate location
    $dbPath2 = Join-Path $env:LOCALAPPDATA "crisp-pos\crisp-pos.sqlite"
    if (Test-Path $dbPath2) {
        Info "Database found: $dbPath2"
    } else {
        Warn "No Crisp POS database found (app hasn't been run yet, or uses different path)"
    }
}

# ============================================================
# 8. SUMMARY + FIX INSTRUCTIONS
# ============================================================
Log "`n============================================================" 'Cyan'
Log "   SUMMARY" 'Cyan'
Log "============================================================" 'Cyan'

# Printer verdict
if ($script:printerFound) {
    Log "`n  PRINTER: WORKING" 'Green'
    Log "    Queue: $($script:printerQueue)" 'Green'
    Log "    --> Use this name in Admin > Hardware" 'Green'
} else {
    Log "`n  PRINTER: NOT WORKING" 'Red'
}

# Scale verdict
if ($script:scalePort) {
    Log "`n  SCALE: FOUND on $($script:scalePort)" 'Green'
    Log "    Protocol: MT 8217, 9600 baud, 7-E-1" 'Green'
} else {
    Log "`n  SCALE: NOT FOUND" 'Red'
}

# Drawer verdict (same as printer -- drawer uses printer DK port)
if ($script:printerFound) {
    Log "`n  DRAWER: SHOULD WORK (via printer DK port)" 'Green'
    Log "    (Check if it opened during the test above)" 'Green'
} else {
    Log "`n  DRAWER: CANNOT WORK (needs working printer)" 'Red'
}

# Fixes needed
if ($script:fixes.Count -gt 0) {
    Log "`n  FIXES NEEDED:" 'Yellow'
    $fixNum = 0
    foreach ($f in ($script:fixes | Select-Object -Unique)) {
        $fixNum++
        Log "    $fixNum. $f" 'Yellow'
    }
}

if ($script:printerFound -and $script:scalePort) {
    Log "`n  ALL HARDWARE LOOKS GOOD!" 'Green'
    Log "  If Crisp POS still has issues, go to Admin > Hardware and:" 'White'
    Log "    1. Click 'Probe All Devices'" 'White'
    Log "    2. If printer shows wrong name, use queue: $($script:printerQueue)" 'White'
    Log "    3. Scale should auto-detect on $($script:scalePort)" 'White'
}

# ============================================================
# SAVE REPORT TO DESKTOP
# ============================================================
$desktop = [Environment]::GetFolderPath('Desktop')
$reportFile = Join-Path $desktop "crisp-diag-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
try {
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Log "`n  Report saved to: $reportFile" 'Cyan'
} catch {
    Log "`n  Could not save report to Desktop: $_" 'Yellow'
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   Done. Check the printer -- did a test receipt print?" -ForegroundColor Cyan
Write-Host "   Did the cash drawer open?" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Keep window open
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
