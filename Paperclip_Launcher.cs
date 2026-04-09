using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PaperclipLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string batchFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Paperclip_Runner.bat");

            if (!File.Exists(batchFile))
            {
                MessageBox.Show("Paperclip_Runner.bat not found in " + AppDomain.CurrentDomain.BaseDirectory, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c \"" + batchFile + "\"",
                WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory,
                UseShellExecute = false,
                CreateNoWindow = true, // This hides the window
                WindowStyle = ProcessWindowStyle.Hidden
            };

            try
            {
                Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to start Paperclip: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
