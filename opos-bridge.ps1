# opos-bridge.ps1 -- OPOS COM bridge for Crisp POS (called from Node.js main process)
# Usage: powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File opos-bridge.ps1 -Action <action> [-DeviceName <name>] [-Data <text>]
#
# Actions:
#   check         -- Check if OPOS COM objects are available (returns JSON)
#   list-devices  -- List OPOS logical device names from registry
#   print         -- Print text via OPOS POSPrinter (Data = text to print)
#   print-raw     -- Print raw ESC/POS bytes via OPOS POSPrinter (Data = base64-encoded bytes)
#   cut           -- Send paper cut command
#   open-drawer   -- Open cash drawer via OPOS CashDrawer
#   read-scale    -- Read weight from OPOS Scale
#   status        -- Get device status (printer, drawer, or scale)
#
# DeviceName: OPOS logical device name configured in SetupPOS.exe (default: tries common names)
# Output: JSON to stdout for Node.js to parse

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('check','list-devices','print','print-raw','cut','open-drawer','read-scale','status')]
    [string]$Action,

    [string]$DeviceName = '',
    [string]$DeviceType = '',
    [string]$Data = ''
)

$ErrorActionPreference = 'Stop'

function JsonResult($ok, $data, $error) {
    $obj = @{ ok = $ok }
    if ($data) { $obj.data = $data }
    if ($error) { $obj.error = $error }
    Write-Output (ConvertTo-Json $obj -Compress -Depth 5)
}

# OPOS constants
$PTR_S_RECEIPT = 2
$CYCL_TRUE = 0  # cyclic for cut
$PTR_BC_CODE128 = 110

# ── Check if OPOS is available ───────────────────────────────────────────────
if ($Action -eq 'check') {
    $result = @{ printer = $false; drawer = $false; scale = $false; progIds = @() }

    # Try known ProgIDs for the OPOS CCOs
    $progIds = @(
        @{ type = 'printer'; ids = @('OPOSPOSPrinter.OPOSPOSPrinter', 'OPOS.POSPrinter', 'OPOSPOSPrinter_CCO.OPOSPOSPrinter.1') },
        @{ type = 'drawer';  ids = @('OPOSCashDrawer.OPOSCashDrawer', 'OPOS.CashDrawer', 'OPOSCashDrawer_CCO.OPOSCashDrawer.1') },
        @{ type = 'scale';   ids = @('OPOSScale.OPOSScale', 'OPOS.Scale', 'OPOSScale_CCO.OPOSScale.1') }
    )

    foreach ($group in $progIds) {
        foreach ($id in $group.ids) {
            try {
                $obj = New-Object -ComObject $id
                $result[$group.type] = $true
                $result.progIds += @{ type = $group.type; progId = $id }
                [System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) | Out-Null
                break  # found one that works
            } catch {}
        }
    }

    # Also try by CLSID directly (from the .ocx files)
    $clsids = @(
        @{ type = 'printer'; clsid = 'CCB90150-B81E-11D2-AB74-0040054C3719' },
        @{ type = 'drawer';  clsid = 'CCB90040-B81E-11D2-AB74-0040054C3719' },
        @{ type = 'scale';   clsid = 'CCB90100-B81E-11D2-AB74-0040054C3719' }
    )
    foreach ($entry in $clsids) {
        if (-not $result[$entry.type]) {
            try {
                $type = [Type]::GetTypeFromCLSID([Guid]$entry.clsid)
                if ($type) {
                    $obj = [Activator]::CreateInstance($type)
                    $result[$entry.type] = $true
                    $result.progIds += @{ type = $entry.type; progId = "CLSID:{$($entry.clsid)}" }
                    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) | Out-Null
                }
            } catch {}
        }
    }

    JsonResult $true $result
    exit 0
}

# ── List OPOS device names from registry ─────────────────────────────────────
if ($Action -eq 'list-devices') {
    $devices = @()
    $regPaths = @(
        'HKLM:\SOFTWARE\OLEforRetail\ServiceOPOS',
        'HKLM:\SOFTWARE\WOW6432Node\OLEforRetail\ServiceOPOS'
    )
    foreach ($root in $regPaths) {
        if (Test-Path $root) {
            # Each subkey is a device type (POSPrinter, CashDrawer, Scale, etc.)
            foreach ($typeKey in (Get-ChildItem $root -ErrorAction SilentlyContinue)) {
                $typeName = $typeKey.PSChildName
                # Each sub-subkey is a logical device name
                foreach ($devKey in (Get-ChildItem $typeKey.PSPath -ErrorAction SilentlyContinue)) {
                    $devName = $devKey.PSChildName
                    $props = @{}
                    foreach ($val in $devKey.Property) {
                        $props[$val] = (Get-ItemProperty $devKey.PSPath).$val
                    }
                    $devices += @{
                        type = $typeName
                        name = $devName
                        path = $devKey.PSPath -replace '.*\\ServiceOPOS\\', ''
                        properties = $props
                    }
                }
            }
        }
    }
    JsonResult $true @{ devices = $devices; count = $devices.Count }
    exit 0
}

# ── Helper: find working ProgID for a device type ────────────────────────────
function Get-OposObject($type) {
    $map = @{
        'printer' = @(
            @{ progId = 'OPOSPOSPrinter.OPOSPOSPrinter' },
            @{ progId = 'OPOS.POSPrinter' },
            @{ clsid = 'CCB90150-B81E-11D2-AB74-0040054C3719' }
        )
        'drawer' = @(
            @{ progId = 'OPOSCashDrawer.OPOSCashDrawer' },
            @{ progId = 'OPOS.CashDrawer' },
            @{ clsid = 'CCB90040-B81E-11D2-AB74-0040054C3719' }
        )
        'scale' = @(
            @{ progId = 'OPOSScale.OPOSScale' },
            @{ progId = 'OPOS.Scale' },
            @{ clsid = 'CCB90100-B81E-11D2-AB74-0040054C3719' }
        )
    }

    foreach ($entry in $map[$type]) {
        try {
            if ($entry.progId) {
                return (New-Object -ComObject $entry.progId)
            } else {
                $t = [Type]::GetTypeFromCLSID([Guid]$entry.clsid)
                return [Activator]::CreateInstance($t)
            }
        } catch {}
    }
    return $null
}

# ── Helper: find logical device name from registry ───────────────────────────
function Get-DeviceName($oposType, $preferredName) {
    if ($preferredName) { return $preferredName }

    # Search registry for configured device names
    $regPaths = @(
        "HKLM:\SOFTWARE\OLEforRetail\ServiceOPOS\$oposType",
        "HKLM:\SOFTWARE\WOW6432Node\OLEforRetail\ServiceOPOS\$oposType"
    )
    foreach ($path in $regPaths) {
        if (Test-Path $path) {
            $names = (Get-ChildItem $path -ErrorAction SilentlyContinue) | ForEach-Object { $_.PSChildName }
            if ($names.Count -gt 0) { return $names[0] }
        }
    }

    # Common defaults
    $defaults = @{
        'POSPrinter' = @('Unit1', 'EpsonPrinter', 'TM-T82II', 'Printer1', 'Receipt')
        'CashDrawer' = @('Unit1', 'EpsonDrawer', 'Drawer1', 'CashDrawer1')
        'Scale'      = @('Unit1', 'Scale1', 'MTScale', 'Viva')
    }
    if ($defaults[$oposType]) { return $defaults[$oposType][0] }
    return 'Unit1'
}

# ── Print via OPOS ───────────────────────────────────────────────────────────
if ($Action -eq 'print' -or $Action -eq 'print-raw' -or $Action -eq 'cut') {
    $printer = Get-OposObject 'printer'
    if (-not $printer) { JsonResult $false $null 'OPOS POSPrinter COM object not available'; exit 1 }

    $name = Get-DeviceName 'POSPrinter' $DeviceName
    try {
        $rc = $printer.Open($name)
        if ($rc -ne 0) { JsonResult $false $null "Open failed: rc=$rc (device name '$name' not found in SetupPOS)"; exit 1 }

        $rc = $printer.ClaimDevice(5000)
        if ($rc -ne 0) {
            $printer.Close()
            JsonResult $false $null "ClaimDevice failed: rc=$rc (another app may have the printer claimed)"
            exit 1
        }

        $printer.DeviceEnabled = $true

        if ($Action -eq 'print') {
            # Text printing - add newline if not present
            $text = $Data
            if (-not $text.EndsWith("`n")) { $text += "`n" }
            $rc = $printer.PrintNormal($PTR_S_RECEIPT, $text)
            if ($rc -ne 0) {
                $errCode = $printer.ResultCode
                $errExt = $printer.ResultCodeExtended
                $printer.DeviceEnabled = $false; $printer.ReleaseDevice(); $printer.Close()
                JsonResult $false $null "PrintNormal failed: rc=$rc errCode=$errCode errExt=$errExt"
                exit 1
            }
        } elseif ($Action -eq 'print-raw') {
            # Raw ESC/POS bytes (base64 encoded from Node.js)
            $bytes = [Convert]::FromBase64String($Data)
            $hexStr = -join ($bytes | ForEach-Object { [char]$_ })
            $rc = $printer.PrintNormal($PTR_S_RECEIPT, $hexStr)
        } elseif ($Action -eq 'cut') {
            $rc = $printer.CutPaper(100)  # 100 = full percentage
        }

        $printer.DeviceEnabled = $false
        $printer.ReleaseDevice()
        $printer.Close()

        JsonResult $true @{ deviceName = $name; action = $Action }
    } catch {
        try { $printer.DeviceEnabled = $false } catch {}
        try { $printer.ReleaseDevice() } catch {}
        try { $printer.Close() } catch {}
        JsonResult $false $null "Printer error: $($_.Exception.Message)"
        exit 1
    } finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($printer) | Out-Null
    }
}

# ── Open Cash Drawer via OPOS ────────────────────────────────────────────────
if ($Action -eq 'open-drawer') {
    $drawer = Get-OposObject 'drawer'
    if (-not $drawer) { JsonResult $false $null 'OPOS CashDrawer COM object not available'; exit 1 }

    $name = Get-DeviceName 'CashDrawer' $DeviceName
    try {
        $rc = $drawer.Open($name)
        if ($rc -ne 0) { JsonResult $false $null "Open failed: rc=$rc (device name '$name' not found in SetupPOS)"; exit 1 }

        $rc = $drawer.ClaimDevice(5000)
        if ($rc -ne 0) {
            $drawer.Close()
            JsonResult $false $null "ClaimDevice failed: rc=$rc"
            exit 1
        }

        $drawer.DeviceEnabled = $true
        $rc = $drawer.OpenDrawer()

        $opened = $drawer.DrawerOpened
        $drawer.DeviceEnabled = $false
        $drawer.ReleaseDevice()
        $drawer.Close()

        if ($rc -ne 0) {
            JsonResult $false $null "OpenDrawer failed: rc=$rc"
            exit 1
        }

        JsonResult $true @{ deviceName = $name; drawerOpened = $opened }
    } catch {
        try { $drawer.DeviceEnabled = $false } catch {}
        try { $drawer.ReleaseDevice() } catch {}
        try { $drawer.Close() } catch {}
        JsonResult $false $null "Drawer error: $($_.Exception.Message)"
        exit 1
    } finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($drawer) | Out-Null
    }
}

# ── Read Scale via OPOS ──────────────────────────────────────────────────────
if ($Action -eq 'read-scale') {
    $scale = Get-OposObject 'scale'
    if (-not $scale) { JsonResult $false $null 'OPOS Scale COM object not available'; exit 1 }

    $name = Get-DeviceName 'Scale' $DeviceName
    try {
        $rc = $scale.Open($name)
        if ($rc -ne 0) { JsonResult $false $null "Open failed: rc=$rc (device name '$name' not found)"; exit 1 }

        $rc = $scale.ClaimDevice(5000)
        if ($rc -ne 0) {
            $scale.Close()
            JsonResult $false $null "ClaimDevice failed: rc=$rc"
            exit 1
        }

        $scale.DeviceEnabled = $true

        # ReadWeight with 5 second timeout
        $weightVar = 0
        $rc = $scale.ReadWeight([ref]$weightVar, 5000)

        $weight = $scale.ScaleLiveWeight
        $unit = $scale.WeightUnit  # 1=gram, 2=kilogram, 3=ounce, 4=pound
        $unitStr = switch ($unit) { 1 { 'g' }; 2 { 'kg' }; 3 { 'oz' }; 4 { 'lb' }; default { 'unknown' } }
        $zeroReady = $scale.ZeroValid
        $status = if ($rc -eq 0) { 'stable' } elseif ($rc -eq 107) { 'in_motion' } else { "error_$rc" }

        $scale.DeviceEnabled = $false
        $scale.ReleaseDevice()
        $scale.Close()

        JsonResult $true @{
            weight = $weight / 1000.0  # OPOS reports in WeightUnit increments
            unit = $unitStr
            status = $status
            stable = ($rc -eq 0)
            raw = $weight
            deviceName = $name
        }
    } catch {
        try { $scale.DeviceEnabled = $false } catch {}
        try { $scale.ReleaseDevice() } catch {}
        try { $scale.Close() } catch {}
        JsonResult $false $null "Scale error: $($_.Exception.Message)"
        exit 1
    } finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($scale) | Out-Null
    }
}

# ── Device Status ────────────────────────────────────────────────────────────
if ($Action -eq 'status') {
    $type = if ($DeviceType) { $DeviceType } else { 'printer' }
    $oposType = switch ($type) { 'printer' { 'POSPrinter' }; 'drawer' { 'CashDrawer' }; 'scale' { 'Scale' }; default { $type } }

    $obj = Get-OposObject $type
    if (-not $obj) { JsonResult $false $null "OPOS $type COM object not available"; exit 1 }

    $name = Get-DeviceName $oposType $DeviceName
    try {
        $rc = $obj.Open($name)
        if ($rc -ne 0) { JsonResult $false $null "Open failed: rc=$rc"; exit 1 }

        $rc = $obj.ClaimDevice(2000)
        if ($rc -ne 0) { $obj.Close(); JsonResult $false $null "ClaimDevice failed: rc=$rc"; exit 1 }

        $obj.DeviceEnabled = $true

        $info = @{
            deviceName = $name
            type = $type
            claimed = $true
            enabled = $true
            state = $obj.State  # 1=closed, 2=idle, 3=busy, 4=error
        }

        # Type-specific status
        if ($type -eq 'printer') {
            $info.coverOpen = $obj.CoverOpen
            $info.receiptEmpty = $obj.RecEmpty
            $info.receiptNearEnd = $obj.RecNearEnd
        } elseif ($type -eq 'drawer') {
            $info.drawerOpened = $obj.DrawerOpened
        }

        $obj.DeviceEnabled = $false
        $obj.ReleaseDevice()
        $obj.Close()

        JsonResult $true $info
    } catch {
        try { $obj.DeviceEnabled = $false } catch {}
        try { $obj.ReleaseDevice() } catch {}
        try { $obj.Close() } catch {}
        JsonResult $false $null "Status error: $($_.Exception.Message)"
        exit 1
    } finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) | Out-Null
    }
}
