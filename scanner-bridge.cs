// scanner-bridge — long-running OPOS Scanner reader for mcpos.
//
// Built as a standalone 32-bit STA console exe because:
//   * Datalogic OPOS CCO (OPOSScanner.ocx) is 32-bit COM, ThreadingModel=Apartment.
//   * COM events / DataCount polling don't work reliably from MTA hosts
//     (PowerShell default) or 64-bit Electron — only STA 32-bit delivers data.
//   * Polling DataCount + reading ScanDataLabel + ClearInput is proven working
//     on this hardware (Magellan 3200VSi, TableScanner profile).
//
// Build:
//   C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /nologo /platform:x86 ^
//     /target:exe /reference:System.Core.dll /out:scanner-bridge.exe scanner-bridge.cs
//
// Run:
//   scanner-bridge.exe [profileName]
//
// stdout protocol (one JSON object per line):
//   {"event":"starting","device":"TableScanner","bitness":"32"}
//   {"event":"opened","device":"TableScanner"}
//   {"event":"scan","label":"781005416071","type":0,"ts":"2026-05-15T08:30:35Z"}
//   {"event":"claim_failed","rc":111,"device":"TableScanner","retry_in":3,"hint":"..."}
//   {"event":"heartbeat","dataCount":0,"deviceEnabled":true}
//   {"event":"reconnecting","retry_in":3}

using System;
using System.Text;
using System.Threading;

class ScannerBridge
{
    static dynamic scanner;
    static string device;
    static volatile bool stop;

    [STAThread]
    static void Main(string[] args)
    {
        device = args.Length > 0 ? args[0] : "TableScanner";
        int retrySeconds = 3;
        if (args.Length > 1) int.TryParse(args[1], out retrySeconds);
        if (retrySeconds < 1) retrySeconds = 3;

        Console.CancelKeyPress += (s, e) => { e.Cancel = true; stop = true; };

        Emit("{\"event\":\"starting\",\"device\":\"" + JsonEscape(device) + "\",\"bitness\":\"" + (IntPtr.Size == 4 ? "32" : "64") + "\",\"apartment\":\"" + Thread.CurrentThread.GetApartmentState() + "\"}");

        while (!stop)
        {
            scanner = null;
            try
            {
                Type t = Type.GetTypeFromProgID("OPOS.Scanner");
                if (t == null)
                {
                    Emit("{\"event\":\"fatal\",\"message\":\"OPOS.Scanner ProgID not registered\"}");
                    return;
                }
                scanner = Activator.CreateInstance(t);

                int rc = (int)scanner.Open(device);
                if (rc != 0)
                {
                    Emit("{\"event\":\"open_failed\",\"rc\":" + rc + ",\"device\":\"" + JsonEscape(device) + "\"}");
                    Sleep(retrySeconds * 1000);
                    continue;
                }

                rc = (int)scanner.ClaimDevice(1500);
                if (rc != 0)
                {
                    Emit("{\"event\":\"claim_failed\",\"rc\":" + rc + ",\"device\":\"" + JsonEscape(device) + "\",\"retry_in\":" + retrySeconds + ",\"hint\":\"Another app (e.g. Profit Track) holds the scanner\"}");
                    try { scanner.Close(); } catch {}
                    Sleep(retrySeconds * 1000);
                    continue;
                }

                scanner.DeviceEnabled = true;
                try { scanner.DecodeData = true; } catch {}
                try { scanner.AutoDisable = false; } catch {}
                scanner.DataEventEnabled = true;

                Emit("{\"event\":\"opened\",\"device\":\"" + JsonEscape(device) + "\"}");

                PollLoop();
            }
            catch (Exception ex)
            {
                Emit("{\"event\":\"error\",\"message\":\"" + JsonEscape(ex.Message) + "\",\"type\":\"" + ex.GetType().Name + "\"}");
            }
            finally
            {
                try { scanner.DeviceEnabled = false; } catch {}
                try { scanner.ReleaseDevice(); } catch {}
                try { scanner.Close(); } catch {}
                scanner = null;
            }

            if (!stop)
            {
                Emit("{\"event\":\"reconnecting\",\"retry_in\":" + retrySeconds + "}");
                Sleep(retrySeconds * 1000);
            }
        }

        Emit("{\"event\":\"shutdown\"}");
    }

    // Poll DataCount; when > 0 read label, emit scan, ClearInput to consume.
    // Each iteration also pumps the message queue (STA apartment requires this
    // for COM internals to dispatch incoming USB-OEM frames into the SO buffer).
    static void PollLoop()
    {
        DateTime lastHeartbeat = DateTime.UtcNow;
        while (!stop)
        {
            try { System.Windows.Forms.Application.DoEvents(); } catch {}

            try
            {
                int count = (int)scanner.DataCount;
                if (count > 0)
                {
                    string label = "";
                    int type = 0;
                    try { label = (string)scanner.ScanDataLabel; } catch {}
                    try { type = (int)scanner.ScanDataType; } catch {}

                    // Consume the buffered scan so DataCount returns to 0
                    try { scanner.ClearInput(); } catch {}
                    try { scanner.DataEventEnabled = true; } catch {}

                    if (!string.IsNullOrEmpty(label))
                    {
                        Emit("{\"event\":\"scan\",\"label\":\"" + JsonEscape(label) + "\",\"type\":" + type + ",\"ts\":\"" + DateTime.UtcNow.ToString("o") + "\"}");
                    }
                }
            }
            catch (Exception ex)
            {
                Emit("{\"event\":\"poll_error\",\"message\":\"" + JsonEscape(ex.Message) + "\"}");
                return;   // bail to outer reconnect loop
            }

            if ((DateTime.UtcNow - lastHeartbeat).TotalSeconds >= 10)
            {
                int dc = 0; bool de = false; bool dee = false;
                try { dc = (int)scanner.DataCount; } catch {}
                try { de = (bool)scanner.DeviceEnabled; } catch {}
                try { dee = (bool)scanner.DataEventEnabled; } catch {}
                Emit("{\"event\":\"heartbeat\",\"dataCount\":" + dc + ",\"deviceEnabled\":" + (de ? "true" : "false") + ",\"dataEventEnabled\":" + (dee ? "true" : "false") + "}");
                lastHeartbeat = DateTime.UtcNow;
            }

            Sleep(60);
        }
    }

    static void Emit(string json)
    {
        try { Console.Out.WriteLine(json); Console.Out.Flush(); } catch {}
    }

    static void Sleep(int ms)
    {
        // Sleep in small slices so DoEvents() / Ctrl+C cancellation can fire.
        int remaining = ms;
        while (remaining > 0 && !stop)
        {
            int slice = remaining > 50 ? 50 : remaining;
            try { System.Windows.Forms.Application.DoEvents(); } catch {}
            Thread.Sleep(slice);
            remaining -= slice;
        }
    }

    static string JsonEscape(string s)
    {
        if (s == null) return "";
        var sb = new StringBuilder(s.Length + 8);
        foreach (var c in s)
        {
            switch (c)
            {
                case '"':  sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\b': sb.Append("\\b");  break;
                case '\f': sb.Append("\\f");  break;
                case '\n': sb.Append("\\n");  break;
                case '\r': sb.Append("\\r");  break;
                case '\t': sb.Append("\\t");  break;
                default:
                    if (c < 32) sb.AppendFormat("\\u{0:X4}", (int)c);
                    else sb.Append(c);
                    break;
            }
        }
        return sb.ToString();
    }
}
