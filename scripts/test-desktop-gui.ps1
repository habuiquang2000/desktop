# Stop existing processes
Get-Process GitHubDesktop* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Sync out folder to dist
robocopy out dist\GitHubDesktop-dev-win32-x64\resources\app /E /IS /IT /W:1 /R:1
Write-Host "Sync completed."

# Launch on WinSta0\Default
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DesktopLauncher {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    [DllImport("kernel32.dll")]
    public static extern void CloseHandle(IntPtr h);

    public static int LaunchOnDefaultDesktop(string exePath, string args) {
        var si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";
        
        var pi = new PROCESS_INFORMATION();
        string cmd = string.Format("\"{0}\" {1}", exePath, args);
        
        bool ok = CreateProcess(null, cmd, IntPtr.Zero, IntPtr.Zero, false, 0x00000010, IntPtr.Zero, null, ref si, out pi);
        if (!ok) {
            int err = Marshal.GetLastWin32Error();
            throw new Exception("CreateProcess failed with error " + err);
        }
        
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return pi.dwProcessId;
    }
}
"@

$exe = (Resolve-Path "dist\GitHubDesktop-dev-win32-x64\GitHubDesktop-dev.exe").Path
$pidVal = [DesktopLauncher]::LaunchOnDefaultDesktop($exe, "")
Write-Host "Launched GitHub Desktop with PID: $pidVal"
