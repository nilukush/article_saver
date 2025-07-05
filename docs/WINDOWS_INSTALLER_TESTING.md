# Windows Installer Testing Guide for macOS Users

This guide helps you test Article Saver's Windows installer from your macOS MacBook Pro.

## Quick Start: VMware Fusion Pro (Free)

### 1. Download VMware Fusion Pro 13.0
- Visit: [Broadcom Support Portal](https://support.broadcom.com/)
- VMware Fusion Pro is now **FREE** for all use (no license key needed)
- Supports both Intel and Apple Silicon Macs

### 2. Download Windows 11 for Testing
```bash
# Option A: Windows 11 Developer VM (Pre-configured)
open https://developer.microsoft.com/en-us/windows/downloads/virtual-machines/

# Option B: Windows 11 ISO (90-day evaluation)
open https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise
```

### 3. Create Testing VM
1. Open VMware Fusion Pro
2. Click "Create a New Virtual Machine"
3. Select your Windows ISO/VM
4. Recommended settings:
   - RAM: 8GB minimum
   - Storage: 60GB
   - Enable "Take a snapshot after installation"

### 4. Install Testing Tools
In your Windows VM, open PowerShell as Administrator:
```powershell
# Enable installer logging
reg add "HKLM\Software\Policies\Microsoft\Windows\Installer" /v Logging /t REG_SZ /d "voicewarmupx!" /f

# Install Chocolatey (package manager)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install useful testing tools
choco install -y procmon sysinternals
```

## Testing Article Saver Installer

### Pre-Test Setup
1. Take a VM snapshot: `Virtual Machine → Take Snapshot → "Clean Windows"`
2. Download Article Saver installer to the VM
3. Open PowerShell as Administrator

### Test Script
Create `test-article-saver.ps1`:
```powershell
# Article Saver Windows Installer Test
Write-Host "Article Saver Installer Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$installer = "C:\Downloads\Article-Saver-Setup-1.1.3.exe"
$logPath = "C:\TestLogs"
New-Item -ItemType Directory -Path $logPath -Force | Out-Null

# Test 1: Digital Signature
Write-Host "`n[TEST 1] Checking Digital Signature..." -ForegroundColor Yellow
$sig = Get-AuthenticodeSignature $installer
if ($sig.Status -eq "NotSigned") {
    Write-Host "⚠️  Installer is not digitally signed (common for Electron apps)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Signature Status: $($sig.Status)" -ForegroundColor Green
}

# Test 2: Silent Installation
Write-Host "`n[TEST 2] Testing Silent Installation..." -ForegroundColor Yellow
$installLog = "$logPath\install_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Process $installer -ArgumentList "/S" -Wait
Start-Sleep -Seconds 10

# Test 3: Verify Installation
Write-Host "`n[TEST 3] Verifying Installation..." -ForegroundColor Yellow
$checks = @{
    "Executable" = "$env:LOCALAPPDATA\Programs\article-saver\Article Saver.exe"
    "Uninstaller" = "$env:LOCALAPPDATA\Programs\article-saver\Uninstall Article Saver.exe"
    "Start Menu" = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Article Saver.lnk"
    "Desktop Shortcut" = "$env:USERPROFILE\Desktop\Article Saver.lnk"
}

$passed = 0
foreach ($item in $checks.GetEnumerator()) {
    if (Test-Path $item.Value) {
        Write-Host "  ✓ $($item.Key) found" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ✗ $($item.Key) NOT found at: $($item.Value)" -ForegroundColor Red
    }
}

# Test 4: Registry Entries
Write-Host "`n[TEST 4] Checking Registry..." -ForegroundColor Yellow
$uninstallKey = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
    Where-Object { $_.DisplayName -like "*Article Saver*" }

if ($uninstallKey) {
    Write-Host "  ✓ Uninstall registry entry found" -ForegroundColor Green
    Write-Host "    - Version: $($uninstallKey.DisplayVersion)" -ForegroundColor Gray
    Write-Host "    - Publisher: $($uninstallKey.Publisher)" -ForegroundColor Gray
    Write-Host "    - Install Location: $($uninstallKey.InstallLocation)" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Uninstall registry entry NOT found" -ForegroundColor Red
}

# Test 5: Launch Application
Write-Host "`n[TEST 5] Testing Application Launch..." -ForegroundColor Yellow
try {
    $exePath = "$env:LOCALAPPDATA\Programs\article-saver\Article Saver.exe"
    if (Test-Path $exePath) {
        Start-Process $exePath
        Start-Sleep -Seconds 5
        $process = Get-Process "Article Saver" -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  ✓ Application launched successfully (PID: $($process.Id))" -ForegroundColor Green
            # Keep it running for manual inspection
            Write-Host "  ℹ️  Application is running - please test manually" -ForegroundColor Cyan
        } else {
            Write-Host "  ✗ Application failed to start" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ✗ Error launching application: $_" -ForegroundColor Red
}

# Test 6: Check for Running Services/Processes
Write-Host "`n[TEST 6] Checking Background Processes..." -ForegroundColor Yellow
$electronProcesses = Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*Article*" }
if ($electronProcesses) {
    Write-Host "  ✓ Found running processes:" -ForegroundColor Green
    $electronProcesses | ForEach-Object {
        Write-Host "    - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "INSTALLATION SUMMARY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Files Installed: $passed/$($checks.Count)" -ForegroundColor $(if ($passed -eq $checks.Count) {"Green"} else {"Yellow"})
Write-Host "Registry Entry: $(if ($uninstallKey) {"FOUND"} else {"NOT FOUND"})" -ForegroundColor $(if ($uninstallKey) {"Green"} else {"Red"})
Write-Host "Application Status: $(if ($process) {"RUNNING"} else {"NOT RUNNING"})" -ForegroundColor $(if ($process) {"Green"} else {"Yellow"})

# Generate detailed report
$report = @"
Article Saver Installation Test Report
=====================================
Date: $(Get-Date)
Installer: $installer
Windows Version: $(Get-WmiObject -class Win32_OperatingSystem).Caption
Architecture: $env:PROCESSOR_ARCHITECTURE

Test Results:
- Digital Signature: $($sig.Status)
- Files Installed: $passed/$($checks.Count)
- Registry Entry: $(if ($uninstallKey) {"Found"} else {"Not Found"})
- Version Installed: $($uninstallKey.DisplayVersion)
- Application Launch: $(if ($process) {"Success"} else {"Failed"})

Installed Locations:
$($checks.GetEnumerator() | ForEach-Object {
    $status = if (Test-Path $_.Value) {"[OK]"} else {"[MISSING]"}
    "  $status $($_.Key): $($_.Value)"
} | Out-String)

Next Steps:
1. Manually test the application functionality
2. Test the uninstaller
3. Revert to snapshot for clean testing
"@

$report | Out-File "$logPath\test_summary.txt"
Write-Host "`nDetailed report saved to: $logPath\test_summary.txt" -ForegroundColor Green
Write-Host "Screenshot the application for documentation!" -ForegroundColor Yellow
```

### Running the Tests
```powershell
# Run the test script
.\test-article-saver.ps1

# After testing, check the uninstaller
& "$env:LOCALAPPDATA\Programs\article-saver\Uninstall Article Saver.exe"

# Verify complete uninstallation
Get-ChildItem "$env:LOCALAPPDATA\Programs\article-saver" -ErrorAction SilentlyContinue
```

## VMware Fusion Pro Tips

### Snapshot Management
- **Before Testing**: `Cmd+Shift+S` → Name: "Clean Windows"
- **After Each Test**: Revert to clean snapshot
- **Save States**: For different test scenarios

### Useful Shortcuts
- **Full Screen**: `Cmd+Ctrl+F`
- **Unity Mode**: `Cmd+Shift+U` (run Windows apps like Mac apps)
- **Screenshot**: `Cmd+Shift+3` (captures VM window)

### File Sharing
1. **Drag & Drop**: Just drag installer from Mac to VM
2. **Shared Folders**: Virtual Machine → Settings → Sharing
3. **Copy/Paste**: Enable in Preferences → Sharing

## Testing Checklist

- [ ] Installer runs without admin rights (Electron NSIS default)
- [ ] Installation completes silently with `/S` flag
- [ ] Application launches successfully
- [ ] All files installed to `%LOCALAPPDATA%\Programs\article-saver\`
- [ ] Start Menu shortcut created
- [ ] Desktop shortcut created (optional)
- [ ] Uninstaller registered in Control Panel
- [ ] Application runs without errors
- [ ] Uninstaller removes all files cleanly
- [ ] No leftover registry entries after uninstall

## Common Issues & Solutions

### Issue: Installer requires admin rights
**Solution**: This is unexpected for Electron apps. Check NSIS configuration.

### Issue: Application won't launch
**Solutions**:
1. Check Visual C++ Redistributables are installed
2. Verify all Electron files are present
3. Check Windows Defender isn't blocking

### Issue: Uninstaller leaves files behind
**Solution**: Common with user data. Document which files are intentionally preserved.

## Additional Testing Tools

```powershell
# Install advanced testing tools
choco install -y processhacker regshot windirstat

# Process Monitor - Track all file/registry changes
# RegShot - Compare registry before/after installation
# WinDirStat - Visualize disk usage changes
```

## Security Testing

```powershell
# Scan with Windows Defender
Start-MpScan -ScanPath $installer -ScanType CustomScan

# Check with VirusTotal (requires API key)
# Or manually upload to virustotal.com
```

## Report Template

After testing, document your findings:

```markdown
## Article Saver Windows Installer Test Report

**Test Date**: [Date]
**Version Tested**: 1.1.3
**Installer Size**: [Size] MB
**Test Environment**: Windows 11 Pro 22H2 (VMware Fusion 13.0)

### Installation Test
- ✅ Silent install works (`/S` flag)
- ✅ Installs to user directory (no admin required)
- ✅ Creates Start Menu shortcut
- ✅ Creates Desktop shortcut
- ✅ Registers uninstaller

### Functionality Test
- ✅ Application launches
- ✅ UI renders correctly
- ✅ Can save articles
- ✅ Sync features work

### Uninstallation Test
- ✅ Uninstaller removes program files
- ✅ Removes Start Menu entries
- ✅ Cleans registry entries
- ⚠️  Preserves user data in %APPDATA%

### Security Scan
- ✅ Windows Defender: Clean
- ✅ No suspicious behavior detected

### Issues Found
- None / [List any issues]

### Recommendations
- [Any improvements needed]
```

Save this test report for your records and user documentation.