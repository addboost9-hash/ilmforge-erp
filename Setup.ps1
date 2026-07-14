
# IlmForge School Management System - Professional Setup
# Windows Installer with License Validation
# Version 3.3 | IlmForge Pakistan

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$INSTALL_DIR    = "$env:PROGRAMFILES\IlmForge"
$APP_DIR        = $PSScriptRoot
$LICENSE_SECRET = "IlmForgeLicense@Secret#2026!OfflineKey"
$BRAND_NAVY     = [System.Drawing.Color]::FromArgb(27, 47, 110)
$BRAND_WHITE    = [System.Drawing.Color]::White

# -- License Key Validator --
function Validate-LicenseKey {
    param([string]$key)
    if ($key.Length -lt 15) { return $false }
    # Basic format check: ILM-XXXX-XXXX-XXXXXXXXXXXX
    if ($key -notmatch '^ILM-\d{4}-[A-Z0-9]{4}-[A-Z0-9]+$') { return $false }
    return $true
}

# -- Helper: create label --
function New-Lbl($text, $x, $y, $w, $h, $sz, $bold, $col) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $text
    $l.Location = [System.Drawing.Point]::new($x, $y)
    $l.Size = [System.Drawing.Size]::new($w, $h)
    $fs = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $l.Font = New-Object System.Drawing.Font("Segoe UI", $sz, $fs)
    if ($col) { $l.ForeColor = $col }
    $l.BackColor = [System.Drawing.Color]::Transparent
    return $l
}

# ===================================================
# SCREEN 1 - License Entry
# ===================================================
function Show-LicenseScreen {

    $frm = New-Object System.Windows.Forms.Form
    $frm.Text = "IlmForge Setup v3.3 - License Verification"
    $frm.Size = [System.Drawing.Size]::new(500, 540)
    $frm.StartPosition = "CenterScreen"
    $frm.FormBorderStyle = "FixedSingle"
    $frm.MaximizeBox = $false
    $frm.BackColor = [System.Drawing.Color]::White

    # Header panel
    $hdr = New-Object System.Windows.Forms.Panel
    $hdr.Size = [System.Drawing.Size]::new(500, 100)
    $hdr.Location = [System.Drawing.Point]::new(0, 0)
    $hdr.BackColor = $BRAND_NAVY
    $frm.Controls.Add($hdr)

    $hdr.Controls.Add((New-Lbl "IlmForge - School Management System" 20 20 450 35 16 $true $BRAND_WHITE))
    $hdr.Controls.Add((New-Lbl "Professional Edition v3.3  |  Pakistan" 22 60 400 22 9 $false ([System.Drawing.Color]::FromArgb(150, 190, 230))))

    # Welcome text
    $frm.Controls.Add((New-Lbl "Welcome to IlmForge Setup" 30 118 440 28 13 $true $BRAND_NAVY))
    $frm.Controls.Add((New-Lbl "Install karne ke liye valid License Key darj karein." 30 150 440 20 9 $false ([System.Drawing.Color]::FromArgb(80,80,80))))
    $frm.Controls.Add((New-Lbl "License key IlmForge support se milti hai: WhatsApp 0346-5146609" 30 170 440 20 8 $false ([System.Drawing.Color]::FromArgb(120,120,120))))

    # License box
    $grp = New-Object System.Windows.Forms.GroupBox
    $grp.Text = " License Key "
    $grp.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $grp.Location = [System.Drawing.Point]::new(30, 205)
    $grp.Size = [System.Drawing.Size]::new(430, 110)
    $grp.ForeColor = $BRAND_NAVY
    $frm.Controls.Add($grp)

    $grp.Controls.Add((New-Lbl "Enter your license key:" 15 22 200 18 9 $true $null))

    $txt = New-Object System.Windows.Forms.TextBox
    $txt.Location = [System.Drawing.Point]::new(15, 44)
    $txt.Size = [System.Drawing.Size]::new(400, 28)
    $txt.Font = New-Object System.Drawing.Font("Consolas", 12)
    $txt.CharacterCasing = "Upper"
    $txt.Text = "ILM-"
    $grp.Controls.Add($txt)

    $lblStatus = New-Lbl "" 15 80 400 22 9 $false ([System.Drawing.Color]::Gray)
    $grp.Controls.Add($lblStatus)

    # Install folder
    $frm.Controls.Add((New-Lbl "Installation Folder:" 30 330 200 20 9 $true $BRAND_NAVY))

    $txtDir = New-Object System.Windows.Forms.TextBox
    $txtDir.Location = [System.Drawing.Point]::new(30, 352)
    $txtDir.Size = [System.Drawing.Size]::new(320, 26)
    $txtDir.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $txtDir.Text = $INSTALL_DIR
    $frm.Controls.Add($txtDir)

    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Location = [System.Drawing.Point]::new(358, 351)
    $btnBrowse.Size = [System.Drawing.Size]::new(102, 28)
    $btnBrowse.Text = "Browse..."
    $btnBrowse.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $btnBrowse.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.SelectedPath = $txtDir.Text
        if ($dlg.ShowDialog() -eq "OK") { $txtDir.Text = $dlg.SelectedPath }
    })
    $frm.Controls.Add($btnBrowse)

    # Options
    $chkDesk = New-Object System.Windows.Forms.CheckBox
    $chkDesk.Text = "Desktop shortcut banayein"
    $chkDesk.Location = [System.Drawing.Point]::new(30, 393)
    $chkDesk.Size = [System.Drawing.Size]::new(220, 22)
    $chkDesk.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $chkDesk.Checked = $true
    $frm.Controls.Add($chkDesk)

    $chkAuto = New-Object System.Windows.Forms.CheckBox
    $chkAuto.Text = "Windows start pe auto-launch"
    $chkAuto.Location = [System.Drawing.Point]::new(255, 393)
    $chkAuto.Size = [System.Drawing.Size]::new(205, 22)
    $chkAuto.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $chkAuto.Checked = $true
    $frm.Controls.Add($chkAuto)

    # Buttons
    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancel"
    $btnCancel.Location = [System.Drawing.Point]::new(285, 460)
    $btnCancel.Size = [System.Drawing.Size]::new(85, 34)
    $btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $btnCancel.Add_Click({ $frm.DialogResult = "Cancel"; $frm.Close() })
    $frm.Controls.Add($btnCancel)

    $btnInst = New-Object System.Windows.Forms.Button
    $btnInst.Text = "Install"
    $btnInst.Location = [System.Drawing.Point]::new(378, 460)
    $btnInst.Size = [System.Drawing.Size]::new(92, 34)
    $btnInst.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $btnInst.BackColor = $BRAND_NAVY
    $btnInst.ForeColor = $BRAND_WHITE
    $btnInst.FlatStyle = "Flat"
    $frm.AcceptButton = $btnInst

    $script:result = $null

    $btnInst.Add_Click({
        $k = $txt.Text.Trim()
        if ($k.Length -lt 10) {
            $lblStatus.ForeColor = [System.Drawing.Color]::Red
            $lblStatus.Text = "License key darj karein."
            return
        }
        if (-not (Validate-LicenseKey $k)) {
            $lblStatus.ForeColor = [System.Drawing.Color]::Red
            $lblStatus.Text = "Invalid format. Example: ILM-0010-STAR-XXXXXXXXXXXX"
            return
        }
        $lblStatus.ForeColor = [System.Drawing.Color]::Green
        $lblStatus.Text = "License OK! Installing..."
        $frm.Refresh()
        Start-Sleep -Milliseconds 500

        $script:result = @{
            key        = $k
            installDir = $txtDir.Text
            desktop    = $chkDesk.Checked
            startup    = $chkAuto.Checked
        }
        $frm.DialogResult = "OK"
        $frm.Close()
    })
    $frm.Controls.Add($btnInst)

    $frm.ShowDialog() | Out-Null
    return $script:result
}

# ===================================================
# SCREEN 2 - Install Progress
# ===================================================
function Show-Progress {
    param($cfg)

    $frm = New-Object System.Windows.Forms.Form
    $frm.Text = "IlmForge Setup - Installing..."
    $frm.Size = [System.Drawing.Size]::new(500, 400)
    $frm.StartPosition = "CenterScreen"
    $frm.FormBorderStyle = "FixedSingle"
    $frm.MaximizeBox = $false
    $frm.ControlBox = $false
    $frm.BackColor = [System.Drawing.Color]::White

    $hdr = New-Object System.Windows.Forms.Panel
    $hdr.Size = [System.Drawing.Size]::new(500, 70)
    $hdr.BackColor = $BRAND_NAVY
    $frm.Controls.Add($hdr)
    $hdr.Controls.Add((New-Lbl "IlmForge - Installing..." 20 12 440 28 14 $true $BRAND_WHITE))
    $hdr.Controls.Add((New-Lbl "Please wait while IlmForge installs on your computer." 22 42 440 20 9 $false ([System.Drawing.Color]::FromArgb(150,190,230))))

    $prog = New-Object System.Windows.Forms.ProgressBar
    $prog.Location = [System.Drawing.Point]::new(20, 88)
    $prog.Size = [System.Drawing.Size]::new(455, 22)
    $prog.Minimum = 0; $prog.Maximum = 100
    $frm.Controls.Add($prog)

    $lblStep = New-Lbl "Preparing..." 20 116 455 20 9 $false ([System.Drawing.Color]::FromArgb(60,60,60))
    $frm.Controls.Add($lblStep)

    $logBox = New-Object System.Windows.Forms.RichTextBox
    $logBox.Location = [System.Drawing.Point]::new(20, 142)
    $logBox.Size = [System.Drawing.Size]::new(455, 200)
    $logBox.Font = New-Object System.Drawing.Font("Consolas", 8)
    $logBox.BackColor = [System.Drawing.Color]::FromArgb(10, 15, 30)
    $logBox.ForeColor = [System.Drawing.Color]::FromArgb(80, 220, 80)
    $logBox.ReadOnly = $true
    $logBox.BorderStyle = "None"
    $frm.Controls.Add($logBox)

    $frm.Show()
    $frm.Refresh()

    function Log($msg, $clr) {
        $logBox.SelectionStart = $logBox.TextLength
        $logBox.SelectionColor = switch ($clr) {
            "yellow" { [System.Drawing.Color]::FromArgb(255,200,50) }
            "red"    { [System.Drawing.Color]::FromArgb(255,80,80) }
            "gray"   { [System.Drawing.Color]::FromArgb(160,160,160) }
            default  { [System.Drawing.Color]::FromArgb(80,220,80) }
        }
        $logBox.AppendText("$msg`n")
        $logBox.ScrollToCaret()
        $frm.Refresh()
    }

    function Step($msg, $pct) {
        $lblStep.Text = $msg
        $prog.Value = [Math]::Min($pct, 100)
        $frm.Refresh()
    }

    $dir = $cfg.installDir

    # Step 1: Node.js
    Step "Checking Node.js..." 5
    Log ">>> Checking Node.js..." "gray"
    $nv = & node --version 2>$null
    if (-not $nv) {
        Log "Node.js not found. Downloading Node.js 20..." "yellow"
        Step "Downloading Node.js..." 10
        $msi = "$env:TEMP\node_setup.msi"
        try {
            (New-Object Net.WebClient).DownloadFile("https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi", $msi)
            Log "Installing Node.js..." "yellow"
            Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine")
            Log "Node.js installed!" "green"
        } catch {
            Log "Node.js download failed! Check internet." "red"
            [System.Windows.Forms.MessageBox]::Show("Node.js install nahi hua. Internet check karein.","Error","OK","Error")
            $frm.Close(); return $false
        }
    } else {
        Log "Node.js found: $nv" "green"
    }

    # Step 2: Copy files
    Step "Copying files to $dir ..." 20
    Log ">>> Copying app files..." "gray"
    try {
        if (Test-Path $dir) { Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue }
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Copy-Item "$APP_DIR\backend"  -Destination "$dir\backend"  -Recurse -Force
        Copy-Item "$APP_DIR\frontend" -Destination "$dir\frontend" -Recurse -Force
        Log "Files copied to $dir" "green"
    } catch {
        Log "Copy failed: $_" "red"
        $frm.Close(); return $false
    }

    # Step 3: SQLite schema
    Step "Setting up local database..." 35
    Log ">>> Switching to SQLite..." "gray"
    $schema = "$dir\backend\prisma\schema.prisma"
    if (Test-Path $schema) {
        (Get-Content $schema) -replace 'provider = "postgresql"','provider = "sqlite"' | Set-Content $schema -Encoding UTF8
        Log "SQLite schema ready" "green"
    } else {
        Log "Warning: schema.prisma not found" "yellow"
    }

    # Step 4: npm install backend
    Step "Installing backend packages..." 45
    Log ">>> npm install backend..." "gray"
    $p = Start-Process "cmd" -ArgumentList "/c npm install --quiet" -WorkingDirectory "$dir\backend" -Wait -PassThru -NoNewWindow
    Log "Backend packages ready (exit: $($p.ExitCode))" "green"

    # Step 5: Prisma DB
    Step "Creating local database..." 60
    Log ">>> prisma db push..." "gray"
    $env:DATABASE_URL = "file:./prisma/dev.db"
    Start-Process "cmd" -ArgumentList "/c npx prisma generate" -WorkingDirectory "$dir\backend" -Wait -NoNewWindow
    Start-Process "cmd" -ArgumentList "/c npx prisma db push --accept-data-loss" -WorkingDirectory "$dir\backend" -Wait -NoNewWindow
    Log "Database created (SQLite)" "green"

    # Step 6: Save license
    Step "Saving license..." 70
    Log ">>> Saving license key..." "gray"
    @{ key=$cfg.key; installedAt=(Get-Date -Format "yyyy-MM-dd") } | ConvertTo-Json | Out-File "$dir\license.json" -Encoding UTF8
    Log "License saved" "green"

    # Step 7: Install serve
    Step "Installing frontend server..." 78
    Log ">>> npm install -g serve..." "gray"
    Start-Process "cmd" -ArgumentList "/c npm install -g serve" -Wait -NoNewWindow
    Log "Frontend server ready" "green"

    # Step 8: Create launcher
    Step "Creating launcher..." 85
    Log ">>> Creating IlmForge.bat..." "gray"
    $bat = "@echo off`r`ncd /d `"$dir\backend`"`r`nset DATABASE_URL=file:./prisma/dev.db`r`nset NODE_ENV=production`r`nset PORT=5000`r`nset JWT_SECRET=IlmForgeLocal@2026#OfflineKey!XyZ789`r`nset JWT_EXPIRES_IN=24h`r`nset PLATFORM_OWNER_KEY=IlmForge@GhulamMujtaba#PlatformOwner2026!Master`r`nset LICENSE_SECRET=IlmForgeLicense@Secret#2026!OfflineKey`r`nset FRONTEND_URL=http://localhost:3000`r`nset APP_URL=http://localhost:5000`r`nstart `"IlmForge Backend`" /min node src/server.js`r`ntimeout /t 4 /nobreak >nul`r`nstart `"`" http://localhost:3000`r`ncd /d `"$dir\frontend`"`r`nnpx serve dist -l 3000 -s`r`n"
    $bat | Out-File "$dir\IlmForge.bat" -Encoding ASCII

    $vbs = "Set sh = CreateObject(`"WScript.Shell`")`r`nsh.Run `"cmd /c `"`"`"$dir\IlmForge.bat`"`"`"`", 0, False`r`nWScript.Sleep 5000`r`nsh.Run `"http://localhost:3000`", 1, False`r`n"
    $vbs | Out-File "$dir\IlmForge.vbs" -Encoding ASCII
    Log "Launcher created" "green"

    # Step 9: Desktop shortcut
    if ($cfg.desktop) {
        Step "Creating desktop shortcut..." 90
        $sh = New-Object -ComObject WScript.Shell
        $lnk = $sh.CreateShortcut("$env:USERPROFILE\Desktop\IlmForge.lnk")
        $lnk.TargetPath = "wscript.exe"
        $lnk.Arguments = "`"$dir\IlmForge.vbs`""
        $lnk.WorkingDirectory = $dir
        $lnk.Description = "IlmForge School Management System"
        $lnk.Save()
        Log "Desktop shortcut created" "green"
    }

    # Step 10: Auto-start
    if ($cfg.startup) {
        Step "Setting up auto-start..." 95
        $startupDir = [Environment]::GetFolderPath("Startup")
        $sh = New-Object -ComObject WScript.Shell
        $lnk = $sh.CreateShortcut("$startupDir\IlmForge.lnk")
        $lnk.TargetPath = "wscript.exe"
        $lnk.Arguments = "`"$dir\IlmForge.vbs`""
        $lnk.WorkingDirectory = $dir
        $lnk.Save()
        Log "Auto-start enabled" "green"
    }

    Step "Installation complete!" 100
    Log "" "gray"
    Log "=======================================" "green"
    Log "  IlmForge installed successfully!" "green"
    Log "  URL: http://localhost:3000" "green"
    Log "=======================================" "green"

    $frm.ControlBox = $true
    $frm.Text = "IlmForge Setup - Complete!"

    $btnFinish = New-Object System.Windows.Forms.Button
    $btnFinish.Text = "Finish and Launch"
    $btnFinish.Location = [System.Drawing.Point]::new(310, 355)
    $btnFinish.Size = [System.Drawing.Size]::new(165, 34)
    $btnFinish.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $btnFinish.BackColor = [System.Drawing.Color]::FromArgb(22, 163, 74)
    $btnFinish.ForeColor = $BRAND_WHITE
    $btnFinish.FlatStyle = "Flat"
    $btnFinish.Add_Click({ $frm.Close(); Start-Process "wscript.exe" "`"$dir\IlmForge.vbs`"" })
    $frm.Controls.Add($btnFinish)
    $frm.Refresh()
    $frm.ShowDialog() | Out-Null
    return $true
}

# ===================================================
# MAIN
# ===================================================
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    $r = [System.Windows.Forms.MessageBox]::Show("Administrator rights chahiye.`nAs Administrator restart karein?","Admin Required","YesNo","Warning")
    if ($r -eq "Yes") {
        Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    }
    exit
}

$cfg = Show-LicenseScreen
if (-not $cfg) { exit }

Show-Progress $cfg | Out-Null
