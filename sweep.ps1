$processes = Get-WmiObject Win32_Process -Filter "Name = 'node.exe'"
foreach ($p in $processes) {
    if ($p.CommandLine -match "paperclip") {
        Write-Host "Killing zombie Paperclip process: $($p.ProcessId)"
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "Sweep complete."
