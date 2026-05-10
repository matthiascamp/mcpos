# diagnose-printer.ps1 - Full printer diagnostic for Crisp POS
# Run: powershell -ExecutionPolicy Bypass -File diagnose-printer.ps1

$ErrorActionPreference = 'SilentlyContinue'
Write-Host ""
Write-Host "=== CRISP POS PRINTER DIAGNOSTIC ===" -ForegroundColor Cyan
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# 1. All printer queues
Write-Host "--- ALL PRINTER QUEUES ---" -ForegroundColor Yellow
$printers = Get-Printer
if ($printers) {
    foreach ($p in $printers) {
        if ($p.PrinterStatus -eq 'Normal') { $color = 'Green' } else { $color = 'Red' }
        Write-Host "  $($p.Name)" -ForegroundColor $color -NoNewline
        Write-Host "  Port=$($p.PortName)  Driver=$($p.DriverName)  Status=$($p.PrinterStatus)  Shared=$($p.Shared)"
    }
} else {
    Write-Host "  NO PRINTERS FOUND" -ForegroundColor Red
}

# 2. Printer ports
Write-Host ""
Write-Host "--- PRINTER PORTS ---" -ForegroundColor Yellow
$ports = Get-PrinterPort
if ($ports) {
    foreach ($port in $ports) {
        Write-Host "  $($port.Name)  Type=$($port.PortType)  Description=$($port.Description)"
    }
} else {
    Write-Host "  No printer ports found" -ForegroundColor Red
}

# 3. USB devices (PnP)
Write-Host ""
Write-Host "--- USB DEVICES (printing-related) ---" -ForegroundColor Yellow
$usbDevices = Get-PnpDevice -Class 'USB','Printer','Ports' -Status OK,Error,Degraded,Unknown 2>$null
if ($usbDevices) {
    foreach ($d in $usbDevices) {
        if ($d.Status -eq 'OK') { $color = 'Green' } else { $color = 'Red' }
        Write-Host "  [$($d.Status)] " -ForegroundColor $color -NoNewline
        Write-Host "$($d.FriendlyName)  Class=$($d.Class)  InstanceId=$($d.InstanceId)"
    }
} else {
    Write-Host "  No USB/Printer/Ports PnP devices found"
}

# 4. Stuck print jobs
Write-Host ""
Write-Host "--- STUCK PRINT JOBS ---" -ForegroundColor Yellow
$hasJobs = $false
foreach ($p in $printers) {
    $jobs = Get-PrintJob -PrinterName $p.Name 2>$null
    if ($jobs) {
        $hasJobs = $true
        foreach ($j in $jobs) {
            Write-Host "  STUCK: '$($p.Name)' Job=$($j.Id) Doc=$($j.DocumentName) Status=$($j.JobStatus) Size=$($j.Size)" -ForegroundColor Red
        }
    }
}
if (-not $hasJobs) { Write-Host "  No stuck jobs (good)" -ForegroundColor Green }

# 5. Print spooler service
Write-Host ""
Write-Host "--- PRINT SPOOLER SERVICE ---" -ForegroundColor Yellow
$spooler = Get-Service -Name Spooler
if ($spooler.Status -eq 'Running') { $color = 'Green' } else { $color = 'Red' }
Write-Host "  Status: $($spooler.Status)  StartType: $($spooler.StartType)" -ForegroundColor $color

# 6. COM / serial ports
Write-Host ""
Write-Host "--- SERIAL / COM PORTS ---" -ForegroundColor Yellow
$comPorts = Get-PnpDevice -Class Ports -Status OK 2>$null
if ($comPorts) {
    foreach ($c in $comPorts) {
        Write-Host "  $($c.FriendlyName)  Status=$($c.Status)"
    }
} else {
    Write-Host "  No COM ports found"
}

# 7. Try raw print test to each receipt-like queue
Write-Host ""
Write-Host "--- RAW PRINT TEST ---" -ForegroundColor Yellow
$receiptKeywords = @('epson','tm-t','tm-u','tm-m','star','bixolon','srp-','citizen','ct-s','thermal','receipt','pos','80mm','58mm')
$rawprintScript = Join-Path $PSScriptRoot 'rawprint.ps1'
$hasRawprint = Test-Path $rawprintScript

foreach ($p in $printers) {
    $pname = $p.Name.ToLower()
    $driver = ($p.DriverName + '').ToLower()
    $isReceipt = $false
    foreach ($kw in $receiptKeywords) {
        if ($pname.Contains($kw) -or $driver.Contains($kw)) { $isReceipt = $true; break }
    }
    if (-not $isReceipt) { continue }

    Write-Host ""
    Write-Host "  Testing: $($p.Name) (Port=$($p.PortName), Status=$($p.PrinterStatus))" -ForegroundColor Cyan

    # Method 1: rawprint.ps1 (P/Invoke)
    if ($hasRawprint) {
        $tmpFile = [System.IO.Path]::GetTempFileName()
        # ESC @ (init) + "TEST" + LF + cut
        [System.IO.File]::WriteAllBytes($tmpFile, @(0x1B, 0x40, 0x54, 0x45, 0x53, 0x54, 0x0A, 0x1D, 0x56, 0x00))
        try {
            $result = & powershell -ExecutionPolicy Bypass -NoProfile -File $rawprintScript -PrinterName $p.Name -FilePath $tmpFile 2>&1
            if ($result -match '^OK') {
                Write-Host "    P/Invoke raw send: OK" -ForegroundColor Green
            } else {
                Write-Host "    P/Invoke raw send: FAILED - $result" -ForegroundColor Red
            }
        } catch {
            Write-Host "    P/Invoke raw send: ERROR - $($_.Exception.Message)" -ForegroundColor Red
        }
        Remove-Item $tmpFile -Force 2>$null
    } else {
        Write-Host "    rawprint.ps1 not found - skipping P/Invoke test" -ForegroundColor DarkYellow
    }

    # Check for error state
    $queueInfo = Get-Printer -Name $p.Name 2>$null
    if ($queueInfo) {
        $status = $queueInfo.PrinterStatus
        if ($status -ne 'Normal') {
            Write-Host "    WARNING: Queue status is '$status' - may need resume/restart" -ForegroundColor Red
            Write-Host "    Attempting resume..." -NoNewline
            try {
                $wmiPrinter = Get-WmiObject -Class Win32_Printer -Filter "Name='$($p.Name.Replace("'","''"))'"
                if ($wmiPrinter) {
                    $wmiPrinter.Resume() | Out-Null
                    Write-Host " done" -ForegroundColor Green
                } else {
                    Write-Host " WMI printer not found" -ForegroundColor Red
                }
            } catch {
                Write-Host " failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# 8. Check if any app is locking USB printer
Write-Host ""
Write-Host "--- PROCESSES USING PRINTER/SERIAL ---" -ForegroundColor Yellow
$suspects = @('ProfitTrack','PTPOS','PtVfd','OPOSScale','OPOSPOSPrinter','node','electron')
foreach ($procName in $suspects) {
    $proc = Get-Process -Name $procName 2>$null
    if ($proc) {
        Write-Host "  RUNNING: $procName (PID $($proc.Id -join ', '))" -ForegroundColor Red
    }
}

# 9. Driver info for receipt printers
Write-Host ""
Write-Host "--- PRINTER DRIVERS INSTALLED ---" -ForegroundColor Yellow
$drivers = Get-PrinterDriver
foreach ($d in $drivers) {
    $lower = $d.Name.ToLower()
    $isReceipt = $false
    foreach ($kw in $receiptKeywords) {
        if ($lower.Contains($kw)) { $isReceipt = $true; break }
    }
    if ($isReceipt) {
        Write-Host "  $($d.Name)  Provider=$($d.PrinterEnvironment)  Path=$($d.InfPath)" -ForegroundColor Green
    }
}
$allDriverNames = ($drivers | ForEach-Object { $_.Name }) -join ', '
Write-Host "  All drivers: $allDriverNames" -ForegroundColor DarkGray

# 10. Windows event log (recent printer errors)
Write-Host ""
Write-Host "--- RECENT PRINTER EVENTS (last 24h) ---" -ForegroundColor Yellow
$since = (Get-Date).AddHours(-24)
try {
    $events = Get-WinEvent -FilterHashtable @{ LogName='System'; StartTime=$since; Level=1,2,3 } -MaxEvents 50 2>$null
    $printEvents = @()
    if ($events) {
        foreach ($e in $events) {
            if ($e.ProviderName -match 'print|spooler') {
                $printEvents += $e
            }
        }
    }
    if ($printEvents.Count -gt 0) {
        foreach ($e in $printEvents[0..9]) {
            if ($e.Level -le 2) { $color = 'Red' } else { $color = 'DarkYellow' }
            $msg = $e.Message
            if ($msg.Length -gt 120) { $msg = $msg.Substring(0, 120) }
            Write-Host "  [$($e.TimeCreated.ToString('HH:mm:ss'))] $msg" -ForegroundColor $color
        }
    } else {
        Write-Host "  No printer errors in last 24h" -ForegroundColor Green
    }
} catch {
    Write-Host "  Could not read event log: $($_.Exception.Message)" -ForegroundColor DarkYellow
}

# 11. Check if "EPSON TM-T82II Receipt" queue exists
Write-Host ""
Write-Host "--- QUEUE DELETION CHECK ---" -ForegroundColor Yellow
$epsonQueue = Get-Printer -Name 'EPSON TM-T82II Receipt' 2>$null
if ($epsonQueue) {
    Write-Host "  'EPSON TM-T82II Receipt' EXISTS - Status=$($epsonQueue.PrinterStatus) Port=$($epsonQueue.PortName)" -ForegroundColor Green
} else {
    Write-Host "  'EPSON TM-T82II Receipt' NOT FOUND - was it deleted by cleanup code?" -ForegroundColor Red
    $anyEpson = Get-Printer | Where-Object { $_.Name -match 'epson|80mm|tm-t' }
    if ($anyEpson) {
        Write-Host "  But found similar:" -ForegroundColor DarkYellow
        foreach ($q in $anyEpson) {
            Write-Host "    $($q.Name)  Port=$($q.PortName)  Status=$($q.PrinterStatus)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  No Epson/receipt queues found at all. Driver may need reinstalling." -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
$receiptPrinters = @()
foreach ($p in $printers) {
    $pn = $p.Name.ToLower()
    $pd = ($p.DriverName + '').ToLower()
    $found = $false
    foreach ($kw in $receiptKeywords) {
        if ($pn.Contains($kw) -or $pd.Contains($kw)) { $found = $true; break }
    }
    if ($found) { $receiptPrinters += $p }
}

if ($receiptPrinters.Count -eq 0) {
    Write-Host "  NO receipt printer queue found. The app WILL NOT be able to print." -ForegroundColor Red
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. Check USB cable is connected" -ForegroundColor White
    Write-Host "    2. Open Settings > Printers & Scanners - is the printer listed?" -ForegroundColor White
    Write-Host "    3. If not: plug in printer, let Windows install driver" -ForegroundColor White
    Write-Host "    4. If listed but not here: driver name may not match keywords" -ForegroundColor White
} elseif ($receiptPrinters.Count -eq 1) {
    $rp = $receiptPrinters[0]
    Write-Host "  Receipt printer: $($rp.Name) (Port=$($rp.PortName), Status=$($rp.PrinterStatus))" -ForegroundColor Green
    if ($rp.PrinterStatus -ne 'Normal') {
        Write-Host "  WARNING: Status is '$($rp.PrinterStatus)'" -ForegroundColor Red
    }
} else {
    Write-Host "  Multiple receipt printers found ($($receiptPrinters.Count)):" -ForegroundColor DarkYellow
    foreach ($rp in $receiptPrinters) {
        Write-Host "    $($rp.Name)  Port=$($rp.PortName)  Status=$($rp.PrinterStatus)"
    }
}
Write-Host ""
