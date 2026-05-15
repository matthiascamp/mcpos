# Quick probe: enumerate COM members on the OPOS Scanner CCO so we can find
# the correct event name (PS may expose it under a non-standard name).
$ErrorActionPreference = 'Continue'

$progIds = @('OPOSScanner.OPOSScanner','OPOS.Scanner','OPOSScanner_CCO.OPOSScanner.1')
$scanner = $null
foreach ($id in $progIds) {
    try { $scanner = New-Object -ComObject $id; if ($scanner) { "Using ProgID: $id"; break } } catch {}
}
if (-not $scanner) {
    try {
        $t = [Type]::GetTypeFromCLSID('CCB901B0-B81E-11D2-AB74-0040054C3719')
        $scanner = [Activator]::CreateInstance($t)
        "Using CLSID: CCB901B0-..."
    } catch {
        "FAILED to create scanner object: $($_.Exception.Message)"
        exit 1
    }
}

"`n=== All members (events first) ==="
$scanner | Get-Member | Group-Object MemberType | ForEach-Object {
    "[$($_.Name)] ($($_.Count))"
    $_.Group | Select-Object -ExpandProperty Name | Sort-Object | ForEach-Object { "   $_" }
}

"`n=== TypeInfo (raw via ITypeInfo if available) ==="
try {
    $ti = [System.Runtime.InteropServices.Marshal]::GetIDispatchForObject($scanner)
    "IDispatch ptr: $ti"
    [System.Runtime.InteropServices.Marshal]::Release($ti) | Out-Null
} catch { "Marshal failed: $($_.Exception.Message)" }

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($scanner) | Out-Null
