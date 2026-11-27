Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;

public class SuggestionsVerifier {
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

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    public delegate bool EnumDesktopWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumDesktopWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBmp, uint nFlags);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    public const uint WM_CHAR = 0x0102;
    public const uint WM_KEYDOWN = 0x0100;
    public const uint WM_KEYUP = 0x0101;
    public const int VK_ESCAPE = 0x1B;

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static int LaunchApp(string exePath, string args) {
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

    public static IntPtr FindWindow() {
        IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) return IntPtr.Zero;

        IntPtr found = IntPtr.Zero;
        EnumDesktopWindows(hDesk, (hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            if (sb.ToString() == "GitHub Desktop") {
                found = hWnd;
                return false;
            }
            return true;
        }, IntPtr.Zero);

        CloseDesktop(hDesk);
        return found;
    }

    public static void CaptureWindow(IntPtr hWnd, string savePath) {
        RECT r;
        GetWindowRect(hWnd, out r);
        int w = r.Right - r.Left;
        int h = r.Bottom - r.Top;
        if (w > 0 && h > 0) {
            using (Bitmap bmp = new Bitmap(w, h)) {
                using (Graphics g = Graphics.FromImage(bmp)) {
                    IntPtr hdc = g.GetHdc();
                    PrintWindow(hWnd, hdc, 2);
                    g.ReleaseHdc(hdc);
                }
                bmp.Save(savePath, ImageFormat.Png);
                Console.WriteLine("Saved screenshot to " + savePath);
            }
        }
    }

    public static void ClickInput(IntPtr hWnd) {
        SetForegroundWindow(hWnd);
        Thread.Sleep(300);
        IntPtr coord = (IntPtr)((155 << 16) | (100 & 0xFFFF));
        PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)1, coord);
        PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, coord);
        Thread.Sleep(400);
    }

    public static void TypeText(IntPtr hWnd, string text) {
        foreach (char c in text) {
            PostMessage(hWnd, WM_CHAR, (IntPtr)c, IntPtr.Zero);
            Thread.Sleep(60);
        }
        Thread.Sleep(500);
    }

    public static void SendEsc(IntPtr hWnd) {
        PostMessage(hWnd, WM_KEYDOWN, (IntPtr)VK_ESCAPE, IntPtr.Zero);
        PostMessage(hWnd, WM_KEYUP, (IntPtr)VK_ESCAPE, IntPtr.Zero);
        Thread.Sleep(300);
    }
}
"@ -ReferencedAssemblies "System.Drawing.dll"

# 1. Stop existing processes
Get-Process GitHubDesktop* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# 2. Launch
$exe = (Resolve-Path "dist\GitHubDesktop-dev-win32-x64\GitHubDesktop-dev.exe").Path
$args = '--cli-open "D:\__Code\___Project\habuiquang2000\GitHubDesktop"'
$pidVal = [SuggestionsVerifier]::LaunchApp($exe, $args)
Write-Host "Launched PID: $pidVal. Waiting for window..."
Start-Sleep -Seconds 6

# 3. Find window
$hWnd = [SuggestionsVerifier]::FindWindow()
if ($hWnd -eq [IntPtr]::Zero) {
    Write-Host "Window not found immediately, waiting another 3s..."
    Start-Sleep -Seconds 3
    $hWnd = [SuggestionsVerifier]::FindWindow()
}
Write-Host "Target window HWND: $hWnd"

if ($hWnd -ne [IntPtr]::Zero) {
    # 4. Click search box to focus it and show initial suggestions
    Write-Host "Clicking search box..."
    [SuggestionsVerifier]::ClickInput($hWnd)
    Start-Sleep -Seconds 1
    
    $shot1 = "C:\Users\anmqu\.gemini\antigravity\brain\4be68c3b-1917-423c-ae67-b5a60d4ec507\github_desktop_suggestions_empty.png"
    [SuggestionsVerifier]::CaptureWindow($hWnd, $shot1)

    # 5. Type 'author:' to show author-filtered suggestions
    Write-Host "Typing 'Bump'..."
    [SuggestionsVerifier]::TypeText($hWnd, "Bump")
    Start-Sleep -Seconds 1

    $shot2 = "C:\Users\anmqu\.gemini\antigravity\brain\4be68c3b-1917-423c-ae67-b5a60d4ec507\github_desktop_suggestions_bump.png"
    [SuggestionsVerifier]::CaptureWindow($hWnd, $shot2)
}
