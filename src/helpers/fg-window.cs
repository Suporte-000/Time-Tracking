using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

class Program {
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    static void Main() {
        try {
            IntPtr hwnd = GetForegroundWindow();
            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);
            var p = Process.GetProcessById((int)pid);
            Console.WriteLine(p.ProcessName + "|" + p.MainWindowTitle);
        } catch {}
    }
}
