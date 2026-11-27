Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;

public class CompleteFlowVerifier {
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
    public const int VK_CONTROL = 0x11;

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static int Launch(string exePath, string args) {
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

    public static void RunFlow(string saveEmptyPath, string saveBumpPath) {
        IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) {
            Console.WriteLine("OpenDesktop failed: " + Marshal.GetLastWin32Error());
            return;
        }

        EnumDesktopWindows(hDesk, (hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string title = sb.ToString();

            if (title == "GitHub Desktop") {
                Console.WriteLine("Found GitHub Desktop window: " + hWnd);
                SetForegroundWindow(hWnd);
                Thread.Sleep(500);

                // 1. Click "History" tab (X: 300, Y: 118)
                Console.WriteLine("Clicking History tab at (300, 118)...");
                IntPtr tabCoord = (IntPtr)((118 << 16) | (300 & 0xFFFF));
                PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)1, tabCoord);
                PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, tabCoord);
                Thread.Sleep(1000);

                // 2. Click "Find commit..." search input box (X: 180, Y: 155)
                Console.WriteLine("Clicking Find commit input at (180, 155)...");
                IntPtr inputCoord = (IntPtr)((155 << 16) | (180 & 0xFFFF));
                PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)1, inputCoord);
                PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, inputCoord);
                Thread.Sleep(1000);

                // 3. Capture suggestions when query is empty
                Capture(hWnd, saveEmptyPath);

                // 4. Type "Bump"
                Console.WriteLine("Typing 'Bump'...");
                string text = "Bump";
                foreach (char c in text) {
                    PostMessage(hWnd, WM_CHAR, (IntPtr)c, IntPtr.Zero);
                    Thread.Sleep(60);
                }
                Thread.Sleep(1200);

                // 5. Capture suggestions and commit list for "Bump"
                Capture(hWnd, saveBumpPath);

                return false;
            }
            return true;
        }, IntPtr.Zero);

        CloseDesktop(hDesk);
    }

    private static void Capture(IntPtr hWnd, string savePath) {
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
}
"@ -ReferencedAssemblies "System.Drawing.dll"

# Stop existing
Get-Process GitHubDesktop* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$exe = (Resolve-Path "dist\GitHubDesktop-dev-win32-x64\GitHubDesktop-dev.exe").Path
$args = '--cli-open "D:\__Code\___Project\habuiquang2000\GitHubDesktop"'
$pidVal = [CompleteFlowVerifier]::Launch($exe, $args)
Write-Host "Launched PID: $pidVal. Waiting 8s for window..."
Start-Sleep -Seconds 8

$shotEmpty = "C:\Users\anmqu\.gemini\antigravity\brain\4be68c3b-1917-423c-ae67-b5a60d4ec507\github_desktop_history_suggestions_empty.png"
$shotBump = "C:\Users\anmqu\.gemini\antigravity\brain\4be68c3b-1917-423c-ae67-b5a60d4ec507\github_desktop_history_suggestions_bump.png"

[CompleteFlowVerifier]::RunFlow($shotEmpty, $shotBump)
Start-Sleep -Seconds 2
