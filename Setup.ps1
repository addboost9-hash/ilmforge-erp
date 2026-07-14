
# IlmForge School Management System - Professional Setup v3.3
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$INSTALL_DIR    = "$env:PROGRAMFILES\IlmForge"
$APP_DIR        = $PSScriptRoot
$BRAND_NAVY     = [System.Drawing.Color]::FromArgb(27, 47, 110)
$BRAND_WHITE    = [System.Drawing.Color]::White

function Make-Label($text,$x,$y,$w,$h,$sz,$bold,$col) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text=$text; $l.Location=[System.Drawing.Point]::new($x,$y)
    $l.Size=[System.Drawing.Size]::new($w,$h)
    $fs = if($bold){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}
    $l.Font = New-Object System.Drawing.Font("Segoe UI",$sz,$fs)
    if($col){$l.ForeColor=$col}
    $l.BackColor=[System.Drawing.Color]::Transparent
    return $l
}

function Validate-Key($key) {
    return ($key -match '^ILM-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{8,}$')
}

# ===================================================
# LICENSE SCREEN
# ===================================================
function Show-License {
    $f = New-Object System.Windows.Forms.Form
    $f.Text="IlmForge Setup - License"; $f.Size=[System.Drawing.Size]::new(490,510)
    $f.StartPosition="CenterScreen"; $f.FormBorderStyle="FixedSingle"
    $f.MaximizeBox=$false; $f.BackColor=[System.Drawing.Color]::White

    $hdr=New-Object System.Windows.Forms.Panel
    $hdr.Size=[System.Drawing.Size]::new(490,95); $hdr.BackColor=$BRAND_NAVY
    $hdr.Controls.Add((Make-Label "IlmForge School Management System" 18 18 440 32 15 $true $BRAND_WHITE))
    $hdr.Controls.Add((Make-Label "Professional Offline Edition v3.3  |  Pakistan" 20 56 440 22 9 $false ([System.Drawing.Color]::FromArgb(150,195,240))))
    $f.Controls.Add($hdr)

    $f.Controls.Add((Make-Label "License Verification" 28 112 440 26 13 $true $BRAND_NAVY))
    $f.Controls.Add((Make-Label "Install karne ke liye valid License Key darj karein." 28 142 440 20 9 $false ([System.Drawing.Color]::Gray)))
    $f.Controls.Add((Make-Label "License ke liye: WhatsApp 0346-5146609" 28 162 440 18 8 $false ([System.Drawing.Color]::Gray)))

    $grp=New-Object System.Windows.Forms.GroupBox
    $grp.Text=" License Key "; $grp.Font=New-Object System.Drawing.Font("Segoe UI",9)
    $grp.Location=[System.Drawing.Point]::new(28,195); $grp.Size=[System.Drawing.Size]::new(424,105)
    $grp.ForeColor=$BRAND_NAVY; $f.Controls.Add($grp)

    $grp.Controls.Add((Make-Label "License Key:" 14 22 200 18 9 $true $null))
    $txt=New-Object System.Windows.Forms.TextBox
    $txt.Location=[System.Drawing.Point]::new(14,44); $txt.Size=[System.Drawing.Size]::new(396,28)
    $txt.Font=New-Object System.Drawing.Font("Consolas",12); $txt.CharacterCasing="Upper"
    $txt.Text="ILM-"; $grp.Controls.Add($txt)
    $lbSt=Make-Label "" 14 78 396 20 9 $false ([System.Drawing.Color]::Gray)
    $grp.Controls.Add($lbSt)

    $f.Controls.Add((Make-Label "Installation Folder:" 28 316 200 20 9 $true $BRAND_NAVY))
    $tDir=New-Object System.Windows.Forms.TextBox
    $tDir.Location=[System.Drawing.Point]::new(28,338); $tDir.Size=[System.Drawing.Size]::new(310,26)
    $tDir.Font=New-Object System.Drawing.Font("Segoe UI",9); $tDir.Text=$INSTALL_DIR
    $f.Controls.Add($tDir)
    $bBr=New-Object System.Windows.Forms.Button
    $bBr.Location=[System.Drawing.Point]::new(346,337); $bBr.Size=[System.Drawing.Size]::new(106,28)
    $bBr.Text="Browse..."; $bBr.Font=New-Object System.Drawing.Font("Segoe UI",9)
    $bBr.Add_Click({ $dlg=New-Object System.Windows.Forms.FolderBrowserDialog; if($dlg.ShowDialog()-eq"OK"){$tDir.Text=$dlg.SelectedPath} })
    $f.Controls.Add($bBr)

    $cDesk=New-Object System.Windows.Forms.CheckBox
    $cDesk.Text="Desktop shortcut"; $cDesk.Location=[System.Drawing.Point]::new(28,376)
    $cDesk.Size=[System.Drawing.Size]::new(180,22); $cDesk.Checked=$true
    $cDesk.Font=New-Object System.Drawing.Font("Segoe UI",9); $f.Controls.Add($cDesk)

    $cAuto=New-Object System.Windows.Forms.CheckBox
    $cAuto.Text="Auto-start on Windows login"; $cAuto.Location=[System.Drawing.Point]::new(214,376)
    $cAuto.Size=[System.Drawing.Size]::new(238,22); $cAuto.Checked=$true
    $cAuto.Font=New-Object System.Drawing.Font("Segoe UI",9); $f.Controls.Add($cAuto)

    $bCan=New-Object System.Windows.Forms.Button
    $bCan.Text="Cancel"; $bCan.Location=[System.Drawing.Point]::new(278,430)
    $bCan.Size=[System.Drawing.Size]::new(82,34); $bCan.Font=New-Object System.Drawing.Font("Segoe UI",9)
    $bCan.Add_Click({$f.Tag="cancel";$f.Close()}); $f.Controls.Add($bCan)

    $bIns=New-Object System.Windows.Forms.Button
    $bIns.Text="Install"; $bIns.Location=[System.Drawing.Point]::new(368,430)
    $bIns.Size=[System.Drawing.Size]::new(88,34)
    $bIns.Font=New-Object System.Drawing.Font("Segoe UI",10,[System.Drawing.FontStyle]::Bold)
    $bIns.BackColor=$BRAND_NAVY; $bIns.ForeColor=$BRAND_WHITE; $bIns.FlatStyle="Flat"
    $f.AcceptButton=$bIns
    $bIns.Add_Click({
        $k=$txt.Text.Trim()
        if($k.Length -lt 10){$lbSt.ForeColor=[System.Drawing.Color]::Red;$lbSt.Text="License key darj karein.";return}
        if(-not(Validate-Key $k)){$lbSt.ForeColor=[System.Drawing.Color]::Red;$lbSt.Text="Format: ILM-0010-STAR-XXXXXXXXXXXX";return}
        $lbSt.ForeColor=[System.Drawing.Color]::Green; $lbSt.Text="License OK!"
        $f.Refresh(); Start-Sleep -Milliseconds 400
        $f.Tag=@{key=$k;installDir=$tDir.Text;desktop=$cDesk.Checked;startup=$cAuto.Checked}
        $f.Close()
    })
    $f.Controls.Add($bIns)
    $f.ShowDialog() | Out-Null
    return $f.Tag
}

# ===================================================
# RUN INSTALL (console + progress window side by side)
# ===================================================
function Run-Install($cfg) {
    $dir = $cfg.installDir

    # Progress window (non-blocking)
    $pf=New-Object System.Windows.Forms.Form
    $pf.Text="IlmForge Setup - Installing..."; $pf.Size=[System.Drawing.Size]::new(480,380)
    $pf.StartPosition="CenterScreen"; $pf.FormBorderStyle="FixedSingle"
    $pf.MaximizeBox=$false; $pf.ControlBox=$false; $pf.BackColor=[System.Drawing.Color]::White

    $ph=New-Object System.Windows.Forms.Panel
    $ph.Size=[System.Drawing.Size]::new(480,65); $ph.BackColor=$BRAND_NAVY
    $ph.Controls.Add((Make-Label "Installing IlmForge..." 18 10 440 28 14 $true $BRAND_WHITE))
    $ph.Controls.Add((Make-Label "Please wait - this may take 3-5 minutes" 20 42 440 18 9 $false ([System.Drawing.Color]::FromArgb(150,195,240))))
    $pf.Controls.Add($ph)

    $pb=New-Object System.Windows.Forms.ProgressBar
    $pb.Location=[System.Drawing.Point]::new(18,80); $pb.Size=[System.Drawing.Size]::new(440,20)
    $pb.Minimum=0; $pb.Maximum=100; $pf.Controls.Add($pb)

    $lbSt=Make-Label "Starting..." 18 106 440 20 9 $false ([System.Drawing.Color]::FromArgb(50,50,50))
    $pf.Controls.Add($lbSt)

    $lb=New-Object System.Windows.Forms.RichTextBox
    $lb.Location=[System.Drawing.Point]::new(18,132); $lb.Size=[System.Drawing.Size]::new(440,190)
    $lb.Font=New-Object System.Drawing.Font("Consolas",8)
    $lb.BackColor=[System.Drawing.Color]::FromArgb(8,12,25)
    $lb.ForeColor=[System.Drawing.Color]::FromArgb(80,220,80)
    $lb.ReadOnly=$true; $lb.BorderStyle="None"; $pf.Controls.Add($lb)

    $pf.Show(); $pf.Refresh()

    function L($m,$c="g") {
        $lb.SelectionStart=$lb.TextLength; $lb.SelectionLength=0
        $lb.SelectionColor=switch($c){"y"{[System.Drawing.Color]::FromArgb(255,200,50)}"r"{[System.Drawing.Color]::FromArgb(255,80,80)}"a"{[System.Drawing.Color]::FromArgb(150,150,150)}default{[System.Drawing.Color]::FromArgb(80,220,80)}}
        $lb.AppendText("$m`n"); $lb.ScrollToCaret(); $pf.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
    }
    function S($m,$p){$lbSt.Text=$m;$pb.Value=[Math]::Min($p,100);$pf.Refresh();[System.Windows.Forms.Application]::DoEvents()}

    # 1 - Node.js
    S "Checking Node.js..." 5
    L ">>> Checking Node.js..." "a"
    $nv=& node --version 2>$null
    if(-not $nv){
        L "Node.js not found. Downloading..." "y"
        S "Downloading Node.js 20..." 10
        $msi="$env:TEMP\node_setup.msi"
        try{
            (New-Object Net.WebClient).DownloadFile("https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi",$msi)
            S "Installing Node.js..." 15
            L "Installing Node.js (please wait ~2 min)..." "y"
            Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
            $env:PATH=[System.Environment]::GetEnvironmentVariable("PATH","Machine")+";" + $env:PATH
            L "Node.js installed OK" "g"
        }catch{L "Node.js download FAILED: $_" "r";[System.Windows.Forms.MessageBox]::Show("Node.js install nahi hua. Internet check karein.","Error","OK","Error");$pf.Close();return $false}
    }else{L "Node.js: $nv" "g"}

    # 2 - Copy files
    S "Copying app files..." 20
    L ">>> Copying files to: $dir" "a"
    try{
        if(Test-Path $dir){Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue}
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Copy-Item "$APP_DIR\backend"  "$dir\backend"  -Recurse -Force
        Copy-Item "$APP_DIR\frontend" "$dir\frontend" -Recurse -Force
        L "Files copied OK" "g"
    }catch{L "Copy FAILED: $_" "r";$pf.Close();return $false}

    # 3 - Switch schema to SQLite
    S "Switching database to SQLite..." 35
    L ">>> Patching schema.prisma for SQLite..." "a"
    $sch="$dir\backend\prisma\schema.prisma"
    if(Test-Path $sch){
        $content = Get-Content $sch -Raw
        $content = $content -replace 'provider\s*=\s*"postgresql"','provider = "sqlite"'
        [System.IO.File]::WriteAllText($sch, $content, [System.Text.Encoding]::UTF8)
        L "Schema switched to SQLite" "g"
        # Verify
        $check = Get-Content $sch -TotalCount 10 | Out-String
        if($check -match 'sqlite'){L "Verified: provider = sqlite" "g"}
        else{L "WARNING: patch may not have worked" "y"}
    }else{L "schema.prisma not found at $sch" "r"}

    # 4 - npm install backend
    S "Installing backend packages (npm install)..." 45
    L ">>> npm install backend..." "a"
    $p=Start-Process "cmd" -ArgumentList "/c npm install" -WorkingDirectory "$dir\backend" -Wait -PassThru -NoNewWindow
    L "npm install done (exit: $($p.ExitCode))" "g"

    # 5 - Prisma
    S "Creating local database..." 60
    L ">>> prisma generate..." "a"
    $env:DATABASE_URL = "file:./prisma/dev.db"
    $p2=Start-Process "cmd" -ArgumentList "/c npx prisma generate" -WorkingDirectory "$dir\backend" -Wait -PassThru -NoNewWindow
    L "prisma generate done (exit: $($p2.ExitCode))" "g"
    L ">>> prisma db push..." "a"
    $p3=Start-Process "cmd" -ArgumentList "/c npx prisma db push --accept-data-loss" -WorkingDirectory "$dir\backend" -Wait -PassThru -NoNewWindow
    L "prisma db push done (exit: $($p3.ExitCode))" "g"

    # 6 - Save license
    S "Saving license..." 70
    L ">>> Saving license key..." "a"
    @{key=$cfg.key;installedAt=(Get-Date -Format "yyyy-MM-dd")} | ConvertTo-Json | Out-File "$dir\license.json" -Encoding UTF8
    L "License saved" "g"

    # 7 - serve
    S "Installing frontend server..." 78
    L ">>> npm install -g serve..." "a"
    Start-Process "cmd" -ArgumentList "/c npm install -g serve" -Wait -NoNewWindow
    L "serve installed" "g"

    # 8 - Launcher
    S "Creating launcher..." 85
    L ">>> Creating IlmForge.bat..." "a"
    $bat = "@echo off`r`ncd /d `"$dir\backend`"`r`n"
    $bat += "set DATABASE_URL=file:./prisma/dev.db`r`n"
    $bat += "set NODE_ENV=production`r`n"
    $bat += "set PORT=5000`r`n"
    $bat += "set JWT_SECRET=IlmForgeLocal@2026#OfflineKey`r`n"
    $bat += "set JWT_EXPIRES_IN=24h`r`n"
    $bat += "set PLATFORM_OWNER_KEY=IlmForge@GhulamMujtaba#PlatformOwner2026!Master`r`n"
    $bat += "set LICENSE_SECRET=IlmForgeLicense@Secret#2026!OfflineKey`r`n"
    $bat += "set FRONTEND_URL=http://localhost:3000`r`n"
    $bat += "set APP_URL=http://localhost:5000`r`n"
    $bat += "start `"IlmForge`" /min node src/server.js`r`n"
    $bat += "timeout /t 4 /nobreak >nul`r`n"
    $bat += "start `"`" http://localhost:3000`r`n"
    $bat += "cd /d `"$dir\frontend`"`r`n"
    $bat += "npx serve dist -l 3000 -s`r`n"
    [System.IO.File]::WriteAllText("$dir\IlmForge.bat", $bat, [System.Text.Encoding]::ASCII)

    $vbs = "Set sh = CreateObject(" + [char]34 + "WScript.Shell" + [char]34 + ")" + "`r`n"
    $vbs += "sh.Run " + [char]34 + "cmd /c " + [char]34 + [char]34 + [char]34 + "$dir\IlmForge.bat" + [char]34 + [char]34 + [char]34 + [char]34 + ", 0, False" + "`r`n"
    $vbs += "WScript.Sleep 5000" + "`r`n"
    $vbs += "sh.Run " + [char]34 + "http://localhost:3000" + [char]34 + ", 1, False" + "`r`n"
    [System.IO.File]::WriteAllText("$dir\IlmForge.vbs", $vbs, [System.Text.Encoding]::ASCII)
    L "Launchers created" "g"

    # 9 - Desktop shortcut
    if($cfg.desktop){
        S "Creating desktop shortcut..." 90
        try{
            $sh=New-Object -ComObject WScript.Shell
            $lnk=$sh.CreateShortcut("$env:USERPROFILE\Desktop\IlmForge.lnk")
            $lnk.TargetPath="wscript.exe"; $lnk.Arguments="`"$dir\IlmForge.vbs`""
            $lnk.WorkingDirectory=$dir; $lnk.Description="IlmForge School Management System"
            $lnk.Save(); L "Desktop shortcut created" "g"
        }catch{L "Shortcut error: $_" "y"}
    }

    # 10 - Auto-start
    if($cfg.startup){
        S "Setting up auto-start..." 95
        try{
            $stDir=[Environment]::GetFolderPath("Startup")
            $sh=New-Object -ComObject WScript.Shell
            $lnk=$sh.CreateShortcut("$stDir\IlmForge.lnk")
            $lnk.TargetPath="wscript.exe"; $lnk.Arguments="`"$dir\IlmForge.vbs`""
            $lnk.WorkingDirectory=$dir; $lnk.Save()
            L "Auto-start enabled" "g"
        }catch{L "Auto-start error: $_" "y"}
    }

    S "Installation Complete!" 100
    L "" "a"
    L "=======================================" "g"
    L "  IlmForge installed successfully!" "g"
    L "  Open: http://localhost:3000" "g"
    L "  Use desktop shortcut to launch" "g"
    L "=======================================" "g"

    $pf.ControlBox=$true; $pf.Text="IlmForge Setup - Done!"

    $bFin=New-Object System.Windows.Forms.Button
    $bFin.Text="Finish and Launch"; $bFin.Location=[System.Drawing.Point]::new(290,335)
    $bFin.Size=[System.Drawing.Size]::new(168,34)
    $bFin.Font=New-Object System.Drawing.Font("Segoe UI",10,[System.Drawing.FontStyle]::Bold)
    $bFin.BackColor=[System.Drawing.Color]::FromArgb(22,163,74)
    $bFin.ForeColor=$BRAND_WHITE; $bFin.FlatStyle="Flat"
    $bFin.Add_Click({$pf.Close();Start-Process "wscript.exe" "`"$dir\IlmForge.vbs`""})
    $pf.Controls.Add($bFin); $pf.Refresh()

    # Wait for user to close
    while($pf.Visible){[System.Windows.Forms.Application]::DoEvents();Start-Sleep -Milliseconds 50}
    return $true
}

# ===================================================
# MAIN
# ===================================================
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if(-not $admin){
    $r=[System.Windows.Forms.MessageBox]::Show("Administrator rights chahiye.`nAs Administrator restart karein?","Admin Required","YesNo","Warning")
    if($r -eq "Yes"){Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs}
    exit
}

$cfg=Show-License
if(-not $cfg -or $cfg -eq "cancel"){exit}

Run-Install $cfg | Out-Null
