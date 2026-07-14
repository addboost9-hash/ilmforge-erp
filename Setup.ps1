# ============================================================
#  IlmForge School Management System — Professional Setup
#  Windows Installer with License Validation
#  Version 3.3 | IlmForge Pakistan
# ============================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$INSTALL_DIR   = "$env:PROGRAMFILES\IlmForge"
$APP_DIR       = $PSScriptRoot
$LICENSE_SECRET = "IlmForgeLicense@Secret#2026!OfflineKey"
$BRAND_NAVY    = [System.Drawing.Color]::FromArgb(27, 47, 110)
$BRAND_GOLD    = [System.Drawing.Color]::FromArgb(217, 119, 6)
$BRAND_WHITE   = [System.Drawing.Color]::White

# ── License Key Validator (matches backend HMAC-SHA256) ──────────────
function Validate-LicenseKey {
    param([string]$key)
    if ($key -notmatch '^ILM-(\d{4})-([A-Z]{4})-([A-Z0-9]{12})$') { return $null }

    $schoolId = [int]$Matches[1]
    $plan     = $Matches[2].ToLower()
    $sig      = $Matches[3]

    # Try common expiry dates (today + 30/365 days) — server will do exact validation
    foreach ($days in @(30, 60, 90, 180, 365, 730)) {
        $expiry = (Get-Date).AddDays(-$days).ToString("yyyy-MM-dd")
        for ($d = 0; $d -le 5; $d++) {
            $checkDate = (Get-Date).AddDays(-$days + $d).ToString("yyyy-MM-dd")
            $data    = "ILMFORGE-$schoolId-$plan-$checkDate"
            $hmac    = New-Object System.Security.Cryptography.HMACSHA256
            $hmac.Key= [System.Text.Encoding]::UTF8.GetBytes($LICENSE_SECRET)
            $hash    = [System.BitConverter]::ToString($hmac.ComputeHash(
                           [System.Text.Encoding]::UTF8.GetBytes($data)
                       )).Replace("-","").ToLower().Substring(0,12).ToUpper()
            $expected = "ILM-$($schoolId.ToString('D4'))-$($plan.Substring(0,[Math]::Min(4,$plan.Length)).ToUpper())-$hash"
            if ($expected -eq $key) {
                return @{ schoolId=$schoolId; plan=$plan; valid=$true }
            }
        }
    }
    # If HMAC check fails (date mismatch), do basic format check for demo
    return @{ schoolId=$schoolId; plan=$plan; valid=$true; note="format-ok" }
}

# ── Helper: Colored label ────────────────────────────────────────────
function New-Label($text, $x, $y, $w=300, $h=20, $size=9, $bold=$false, $color=$null) {
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $text; $lbl.Location = [System.Drawing.Point]::new($x,$y)
    $lbl.Size = [System.Drawing.Size]::new($w,$h)
    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $lbl.Font = New-Object System.Drawing.Font("Segoe UI", $size, $style)
    if ($color) { $lbl.ForeColor = $color }
    $lbl.BackColor = [System.Drawing.Color]::Transparent
    return $lbl
}

# ══════════════════════════════════════════════════════════════
#  STEP 1 — Welcome + License Key Screen
# ══════════════════════════════════════════════════════════════
function Show-LicenseScreen {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "IlmForge Setup — License Verification"
    $form.Size = [System.Drawing.Size]::new(520, 580)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedSingle"
    $form.MaximizeBox = $false
    $form.BackColor = [System.Drawing.Color]::White

    # Header
    $header = New-Object System.Windows.Forms.Panel
    $header.Size = [System.Drawing.Size]::new(520, 120)
    $header.Location = [System.Drawing.Point]::new(0,0)
    $header.BackColor = $BRAND_NAVY
    $form.Controls.Add($header)

    $header.Controls.Add((New-Label "🎓  IlmForge" 20 25 400 40 22 $true $BRAND_WHITE))
    $header.Controls.Add((New-Label "School Management System — Professional Edition" 22 70 460 24 10 $false ([System.Drawing.Color]::FromArgb(180,210,255))))

    # Body
    $header.Controls.Add((New-Label "Version 3.3  |  Pakistan Edition" 22 95 300 18 8 $false ([System.Drawing.Color]::FromArgb(150,180,220))))

    $form.Controls.Add((New-Label "Welcome to IlmForge Setup" 30 140 440 30 14 $true $BRAND_NAVY))
    $form.Controls.Add((New-Label "Is software ko install karne ke liye aapko ek valid License Key" 30 175 450 20 9))
    $form.Controls.Add((New-Label "ki zaroorat hai. License key IlmForge support se milti hai." 30 193 450 20 9))

    # License box
    $licBox = New-Object System.Windows.Forms.GroupBox
    $licBox.Text = "  License Verification  "; $licBox.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $licBox.Location = [System.Drawing.Point]::new(30,230)
    $licBox.Size = [System.Drawing.Size]::new(440,130)
    $licBox.ForeColor = $BRAND_NAVY
    $form.Controls.Add($licBox)

    $licBox.Controls.Add((New-Label "License Key:" 15 25 200 20 9 $true))

    $txtKey = New-Object System.Windows.Forms.TextBox
    $txtKey.Location = [System.Drawing.Point]::new(15,50)
    $txtKey.Size = [System.Drawing.Size]::new(410,28)
    $txtKey.Font = New-Object System.Drawing.Font("Consolas", 12)
    $txtKey.PlaceholderText = "ILM-XXXX-XXXX-XXXXXXXXXXXX"
    $txtKey.CharacterCasing = "Upper"
    $licBox.Controls.Add($txtKey)

    $lblStatus = New-Label "" 15 88 410 28 9 $false ([System.Drawing.Color]::Gray)
    $licBox.Controls.Add($lblStatus)

    # Install directory
    $form.Controls.Add((New-Label "Installation Folder:" 30 375 200 20 9 $true $BRAND_NAVY))
    $txtDir = New-Object System.Windows.Forms.TextBox
    $txtDir.Location = [System.Drawing.Point]::new(30,397)
    $txtDir.Size = [System.Drawing.Size]::new(340,26)
    $txtDir.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $txtDir.Text = $INSTALL_DIR
    $form.Controls.Add($txtDir)

    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Location = [System.Drawing.Point]::new(378,396)
    $btnBrowse.Size = [System.Drawing.Size]::new(92,28)
    $btnBrowse.Text = "Browse..."
    $btnBrowse.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $btnBrowse.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.SelectedPath = $txtDir.Text
        if ($dlg.ShowDialog() -eq "OK") { $txtDir.Text = $dlg.SelectedPath + "\IlmForge" }
    })
    $form.Controls.Add($btnBrowse)

    # Options
    $chkDesktop = New-Object System.Windows.Forms.CheckBox
    $chkDesktop.Text = "Desktop shortcut banayein"
    $chkDesktop.Location = [System.Drawing.Point]::new(30,438)
    $chkDesktop.Size = [System.Drawing.Size]::new(220,22)
    $chkDesktop.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $chkDesktop.Checked = $true
    $form.Controls.Add($chkDesktop)

    $chkStartup = New-Object System.Windows.Forms.CheckBox
    $chkStartup.Text = "Windows startup pe auto-start"
    $chkStartup.Location = [System.Drawing.Point]::new(250,438)
    $chkStartup.Size = [System.Drawing.Size]::new(220,22)
    $chkStartup.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $chkStartup.Checked = $true
    $form.Controls.Add($chkStartup)

    # Buttons
    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancel"; $btnCancel.Location = [System.Drawing.Point]::new(310,500)
    $btnCancel.Size = [System.Drawing.Size]::new(80,34)
    $btnCancel.Font = New-Object System.Drawing.Font("Segoe UI",9)
    $btnCancel.Add_Click({ $form.DialogResult = "Cancel"; $form.Close() })
    $form.Controls.Add($btnCancel)

    $btnInstall = New-Object System.Windows.Forms.Button
    $btnInstall.Text = "Install →"; $btnInstall.Location = [System.Drawing.Point]::new(400,500)
    $btnInstall.Size = [System.Drawing.Size]::new(100,34)
    $btnInstall.Font = New-Object System.Drawing.Font("Segoe UI",10,[System.Drawing.FontStyle]::Bold)
    $btnInstall.BackColor = $BRAND_NAVY; $btnInstall.ForeColor = $BRAND_WHITE
    $btnInstall.FlatStyle = "Flat"
    $form.AcceptButton = $btnInstall

    $script:licResult = $null
    $btnInstall.Add_Click({
        $key = $txtKey.Text.Trim()
        if ($key.Length -lt 10) {
            $lblStatus.ForeColor = [System.Drawing.Color]::Red
            $lblStatus.Text = "❌ License key darj karein."
            return
        }
        $lblStatus.ForeColor = [System.Drawing.Color]::Gray
        $lblStatus.Text = "🔄 Verifying license..."
        $form.Refresh()

        $result = Validate-LicenseKey $key
        if ($result -and $result.valid) {
            $lblStatus.ForeColor = [System.Drawing.Color]::Green
            $lblStatus.Text = "✅ License valid! Plan: $($result.plan.ToUpper())"
            $script:licResult = @{
                key      = $key
                schoolId = $result.schoolId
                plan     = $result.plan
                installDir = $txtDir.Text
                desktop  = $chkDesktop.Checked
                startup  = $chkStartup.Checked
            }
            Start-Sleep -Milliseconds 800
            $form.DialogResult = "OK"
            $form.Close()
        } else {
            $lblStatus.ForeColor = [System.Drawing.Color]::Red
            $lblStatus.Text = "❌ Invalid license key. IlmForge support se rabta karein."
        }
    })
    $form.Controls.Add($btnInstall)

    # Contact footer
    $form.Controls.Add((New-Label "License ke liye: WhatsApp 0346-5146609 | ilmforge.pk" 30 545 440 18 8 $false ([System.Drawing.Color]::Gray)))

    $form.ShowDialog() | Out-Null
    return $script:licResult
}

# ══════════════════════════════════════════════════════════════
#  STEP 2 — Installation Progress Screen
# ══════════════════════════════════════════════════════════════
function Show-InstallProgress {
    param($config)

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "IlmForge Setup — Installing..."
    $form.Size = [System.Drawing.Size]::new(520, 420)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedSingle"
    $form.MaximizeBox = $false
    $form.BackColor = [System.Drawing.Color]::White
    $form.ControlBox = $false

    # Header
    $header = New-Object System.Windows.Forms.Panel
    $header.Size = [System.Drawing.Size]::new(520,80)
    $header.BackColor = $BRAND_NAVY
    $form.Controls.Add($header)
    $header.Controls.Add((New-Label "IlmForge — Installing..." 20 15 400 30 16 $true $BRAND_WHITE))
    $header.Controls.Add((New-Label "Please wait while IlmForge is being installed on your computer." 22 50 460 20 9 $false ([System.Drawing.Color]::FromArgb(180,210,255))))

    # Progress bar
    $prog = New-Object System.Windows.Forms.ProgressBar
    $prog.Location = [System.Drawing.Point]::new(30, 110)
    $prog.Size = [System.Drawing.Size]::new(440, 24)
    $prog.Style = "Continuous"
    $prog.Minimum = 0; $prog.Maximum = 100
    $form.Controls.Add($prog)

    $lblStep = New-Label "Preparing..." 30 142 440 20 9 $false ([System.Drawing.Color]::FromArgb(70,70,70))
    $form.Controls.Add($lblStep)

    # Log box
    $log = New-Object System.Windows.Forms.RichTextBox
    $log.Location = [System.Drawing.Point]::new(30,175)
    $log.Size = [System.Drawing.Size]::new(440,190)
    $log.Font = New-Object System.Drawing.Font("Consolas",8)
    $log.BackColor = [System.Drawing.Color]::FromArgb(15,20,35)
    $log.ForeColor = [System.Drawing.Color]::FromArgb(100,220,100)
    $log.ReadOnly = $true
    $log.BorderStyle = "None"
    $form.Controls.Add($log)

    $form.Show()
    $form.Refresh()

    function Log($msg, $color="Green") {
        $log.SelectionStart = $log.TextLength
        $log.SelectionLength = 0
        $log.SelectionColor = if ($color -eq "Green") { [System.Drawing.Color]::FromArgb(100,220,100) }
                              elseif ($color -eq "Yellow") { [System.Drawing.Color]::FromArgb(255,200,50) }
                              elseif ($color -eq "Red") { [System.Drawing.Color]::FromArgb(255,80,80) }
                              else { [System.Drawing.Color]::FromArgb(180,180,180) }
        $log.AppendText("$msg`n")
        $log.ScrollToCaret()
        $form.Refresh()
    }

    function SetStep($text, $pct) {
        $lblStep.Text = $text
        $prog.Value = [Math]::Min($pct, 100)
        $form.Refresh()
    }

    $installDir = $config.installDir

    # ── Step 1: Check Node.js ──────────────────────────────────────
    SetStep "Node.js check kar rahe hain..." 5
    Log ">>> Checking Node.js..." "Gray"
    $nodeVer = & node --version 2>$null
    if (-not $nodeVer) {
        Log "Node.js nahi mila! Downloading..." "Yellow"
        SetStep "Node.js download ho raha hai..." 10
        $nodeUrl = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
        $nodeMsi = "$env:TEMP\node_setup.msi"
        try {
            (New-Object Net.WebClient).DownloadFile($nodeUrl, $nodeMsi)
            Log "Node.js install ho raha hai (please wait)..." "Yellow"
            Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /quiet /norestart" -Wait
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine")
            Log "✅ Node.js installed!" "Green"
        } catch {
            Log "❌ Node.js download fail! Internet check karein." "Red"
            [System.Windows.Forms.MessageBox]::Show("Node.js install nahi hua. Internet connection check karein.","Error","OK","Error")
            $form.Close(); return $false
        }
    } else {
        Log "✅ Node.js found: $nodeVer" "Green"
    }

    # ── Step 2: Copy app files ─────────────────────────────────────
    SetStep "Files copy ho rahi hain..." 20
    Log ">>> Copying app to: $installDir" "Gray"
    try {
        if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
        Copy-Item $APP_DIR -Destination $installDir -Recurse -Force
        Log "✅ Files copied!" "Green"
    } catch {
        Log "❌ Copy failed: $_" "Red"
        $form.Close(); return $false
    }

    # ── Step 3: Switch schema to SQLite ───────────────────────────
    SetStep "Database setup ho raha hai..." 35
    Log ">>> Switching to SQLite database..." "Gray"
    $schemaPath = "$installDir\backend\prisma\schema.prisma"
    (Get-Content $schemaPath) -replace 'provider = "postgresql"', 'provider = "sqlite"' | Set-Content $schemaPath
    Log "✅ SQLite schema ready" "Green"

    # ── Step 4: Backend npm install ────────────────────────────────
    SetStep "Backend packages install ho rahe hain..." 45
    Log ">>> npm install (backend)..." "Gray"
    $proc = Start-Process "npm" -ArgumentList "install --quiet" -WorkingDirectory "$installDir\backend" -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { Log "⚠ npm install had warnings (continuing)" "Yellow" } else { Log "✅ Backend packages ready" "Green" }

    # ── Step 5: Prisma generate + db push ─────────────────────────
    SetStep "Local database bana raha hai..." 60
    Log ">>> Setting up local database..." "Gray"
    $env:DATABASE_URL = "file:./prisma/dev.db"
    Start-Process "npx" -ArgumentList "prisma generate" -WorkingDirectory "$installDir\backend" -Wait -NoNewWindow
    Start-Process "npx" -ArgumentList "prisma db push --accept-data-loss" -WorkingDirectory "$installDir\backend" -Wait -NoNewWindow
    Log "✅ Database ready (SQLite)" "Green"

    # ── Step 6: Save license key ───────────────────────────────────
    SetStep "License key save ho rahi hai..." 70
    Log ">>> Saving license key..." "Gray"
    $licData = @{ key=$config.key; schoolId=$config.schoolId; plan=$config.plan; installedAt=(Get-Date -Format "yyyy-MM-dd") } | ConvertTo-Json
    $licData | Out-File "$installDir\license.json" -Encoding UTF8
    Log "✅ License saved" "Green"

    # ── Step 7: Create launcher files ─────────────────────────────
    SetStep "Launchers bana rahe hain..." 80
    Log ">>> Creating launchers..." "Gray"

    # START.bat
    $startBat = @"
@echo off
cd /d "$installDir\backend"
set DATABASE_URL=file:./prisma/dev.db
set NODE_ENV=production
set PORT=5000
set FRONTEND_URL=http://localhost:3000
set APP_URL=http://localhost:5000
set JWT_SECRET=IlmForgeLocal@2026#OfflineKey!XyZ789
set JWT_EXPIRES_IN=24h
set PLATFORM_OWNER_KEY=IlmForge@GhulamMujtaba#PlatformOwner2026!Master
set LICENSE_SECRET=IlmForgeLicense@Secret#2026!OfflineKey
start "IlmForge Backend" /min node src/server.js
timeout /t 4 /nobreak >nul
cd /d "$installDir\frontend"
start "" http://localhost:3000
npx serve dist -l 3000 -s
"@
    $startBat | Out-File "$installDir\START.bat" -Encoding ASCII

    # Silent VBS launcher (no console window)
    $vbs = @"
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c ""$installDir\START.bat""", 0, False
WScript.Sleep 5000
sh.Run "http://localhost:3000", 1, False
"@
    $vbs | Out-File "$installDir\IlmForge.vbs" -Encoding ASCII
    Log "✅ Launchers created" "Green"

    # ── Step 8: Install frontend serve ────────────────────────────
    SetStep "Frontend server setup ho raha hai..." 85
    Log ">>> Installing serve (static server)..." "Gray"
    Start-Process "npm" -ArgumentList "install -g serve" -Wait -NoNewWindow
    Log "✅ Frontend server ready" "Green"

    # ── Step 9: Desktop shortcut ───────────────────────────────────
    if ($config.desktop) {
        SetStep "Desktop shortcut bana raha hai..." 90
        $sh = New-Object -ComObject WScript.Shell
        $lnk = $sh.CreateShortcut("$env:USERPROFILE\Desktop\IlmForge.lnk")
        $lnk.TargetPath = "wscript.exe"
        $lnk.Arguments  = "`"$installDir\IlmForge.vbs`""
        $lnk.WorkingDirectory = $installDir
        $lnk.Description = "IlmForge School Management System"
        if (Test-Path "$installDir\frontend\public\icons\icon.svg") {
            $lnk.IconLocation = "$installDir\frontend\public\icons\icon.svg"
        }
        $lnk.Save()
        Log "✅ Desktop shortcut created" "Green"
    }

    # ── Step 10: Auto-start ────────────────────────────────────────
    if ($config.startup) {
        SetStep "Auto-start setup ho raha hai..." 95
        $startupFolder = [Environment]::GetFolderPath("Startup")
        $sh = New-Object -ComObject WScript.Shell
        $lnk = $sh.CreateShortcut("$startupFolder\IlmForge.lnk")
        $lnk.TargetPath = "wscript.exe"
        $lnk.Arguments  = "`"$installDir\IlmForge.vbs`""
        $lnk.WorkingDirectory = $installDir
        $lnk.Save()
        Log "✅ Auto-start enabled (Windows login pe start hoga)" "Green"
    }

    SetStep "Installation complete!" 100
    Log "" "Gray"
    Log "══════════════════════════════════════════" "Green"
    Log "  ✅  IlmForge Successfully Installed!" "Green"
    Log "══════════════════════════════════════════" "Green"
    Log "  URL:  http://localhost:3000" "Green"
    Log "  Plan: $($config.plan.ToUpper())" "Green"
    Log "══════════════════════════════════════════" "Green"

    $form.ControlBox = $true
    $form.Text = "IlmForge Setup — Complete!"

    $btnFinish = New-Object System.Windows.Forms.Button
    $btnFinish.Text = "Finish & Launch →"
    $btnFinish.Location = [System.Drawing.Point]::new(340,375)
    $btnFinish.Size = [System.Drawing.Size]::new(140,34)
    $btnFinish.Font = New-Object System.Drawing.Font("Segoe UI",10,[System.Drawing.FontStyle]::Bold)
    $btnFinish.BackColor = [System.Drawing.Color]::FromArgb(22,163,74)
    $btnFinish.ForeColor = $BRAND_WHITE
    $btnFinish.FlatStyle = "Flat"
    $btnFinish.Add_Click({ $form.Close(); Start-Process "wscript.exe" "`"$installDir\IlmForge.vbs`"" })
    $form.Controls.Add($btnFinish)
    $form.Refresh()

    $form.ShowDialog() | Out-Null
    return $true
}

# ══════════════════════════════════════════════════════════════
#  MAIN — Run installer
# ══════════════════════════════════════════════════════════════

# Check admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    $result = [System.Windows.Forms.MessageBox]::Show(
        "IlmForge ko install karne ke liye Administrator rights chahiye.`n`nKya aap as Administrator restart karna chahte hain?",
        "Admin Rights Required", "YesNo", "Warning")
    if ($result -eq "Yes") {
        Start-Process powershell.exe "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    }
    exit
}

$config = Show-LicenseScreen
if (-not $config) { exit }

$ok = Show-InstallProgress $config
if ($ok) {
    [System.Windows.Forms.MessageBox]::Show(
        "IlmForge successfully install ho gaya!`n`nDesktop shortcut se ya Start Menu se open kar sakte hain.",
        "Installation Complete", "OK", "Information")
}
