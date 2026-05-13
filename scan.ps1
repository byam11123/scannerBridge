# scan.ps1 - Fixed paper source for Canon iR2925
param(
    [int]$DPI = 300,
    [string]$ColorMode = "Gray",
    [string]$PaperSource = "Feeder",
    [string]$PageSize = "A4",
    [string]$DeviceName = "",
    [string]$OutputPath = "C:\scans\output.jpg"
)

$folder = Split-Path $OutputPath
if (!(Test-Path $folder)) {
    New-Item -ItemType Directory -Path $folder | Out-Null
}

$scanScript = {
    param($DPI, $ColorMode, $PaperSource, $PageSize, $DeviceName, $OutputPath)
    try {
        $deviceManager = New-Object -ComObject WIA.DeviceManager
        if ($deviceManager.DeviceInfos.Count -eq 0) { throw "No WIA scanner found." }

        $deviceInfo = $null
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $d = $deviceManager.DeviceInfos.Item($i)
            if ($DeviceName -eq "" -or $d.Properties("Name").Value -eq $DeviceName) {
                $deviceInfo = $d
                break
            }
        }
        if ($null -eq $deviceInfo) { throw "Device '$DeviceName' not found." }

        $device = $deviceInfo.Connect()

        # Log all available items (scan sources)
        Write-Host "Device has $($device.Items.Count) scan source(s):"
        for ($i = 1; $i -le $device.Items.Count; $i++) {
            $itm = $device.Items.Item($i)
            $itemName = "Item$i"
            try { $itemName = $itm.Properties("Item Name").Value } catch {}
            Write-Host "  Item($i) = $itemName"
        }

        # Select item by paper source
        # WIA: Item(1)=Flatbed, Item(2)=ADF/Feeder, Item(3)=Duplex
        $itemIndex = 1
        if ($PaperSource -eq "Feeder") {
            if ($device.Items.Count -ge 2) { $itemIndex = 2 }
            else { Write-Host "WARNING: ADF not found, using Flatbed" }
        } elseif ($PaperSource -eq "Duplex") {
            if ($device.Items.Count -ge 3) { $itemIndex = 3 }
            elseif ($device.Items.Count -ge 2) { $itemIndex = 2 }
        }
        Write-Host "Using Item($itemIndex) for source: $PaperSource"
        $scanner = $device.Items.Item($itemIndex)

        $colorValue = switch ($ColorMode) {
            "Color"      { 1 }
            "Gray"       { 2 }
            "BlackWhite" { 4 }
            default      { 2 }
        }

        $pageDims = switch ($PageSize) {
            "A4"     { @{ W = [int]([math]::Round(8.27  * $DPI)); H = [int]([math]::Round(11.69 * $DPI)) } }
            "A3"     { @{ W = [int]([math]::Round(11.69 * $DPI)); H = [int]([math]::Round(16.54 * $DPI)) } }
            "Letter" { @{ W = [int]([math]::Round(8.5   * $DPI)); H = [int]([math]::Round(11.0  * $DPI)) } }
            "Legal"  { @{ W = [int]([math]::Round(8.5   * $DPI)); H = [int]([math]::Round(14.0  * $DPI)) } }
            default  { @{ W = [int]([math]::Round(8.27  * $DPI)); H = [int]([math]::Round(11.69 * $DPI)) } }
        }

        foreach ($prop in $scanner.Properties) {
            try {
                switch ($prop.PropertyID) {
                    6146 { $prop.Value = $colorValue }
                    6147 { $prop.Value = $DPI }
                    6148 { $prop.Value = $DPI }
                    6151 { $prop.Value = 0 }
                    6152 { $prop.Value = 0 }
                    6153 { $prop.Value = $pageDims.W }
                    6154 { $prop.Value = $pageDims.H }
                }
            } catch { Write-Host "Skipped prop $($prop.PropertyID)" }
        }

        Write-Host "Scanning at $DPI dpi, $ColorMode, $PageSize ($($pageDims.W)x$($pageDims.H)px)..."
        $image = $scanner.Transfer("{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}")
        $image.SaveFile($OutputPath)
        Write-Host "SUCCESS:$OutputPath"

    } catch {
        Write-Error "$($_.Exception.Message)"
        exit 1
    }
}

# STA runspace required for WIA COM
$rs = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
$rs.ApartmentState = "STA"
$rs.Open()

$ps = [PowerShell]::Create()
$ps.Runspace = $rs
$null = $ps.AddScript($scanScript).AddArgument($DPI).AddArgument($ColorMode).AddArgument($PaperSource).AddArgument($PageSize).AddArgument($DeviceName).AddArgument($OutputPath)

$result = $ps.Invoke()
$result | ForEach-Object { Write-Host $_ }

if ($ps.HadErrors) {
    $ps.Streams.Error | ForEach-Object { Write-Error $_ }
    $rs.Close()
    exit 1
}

$rs.Close()
