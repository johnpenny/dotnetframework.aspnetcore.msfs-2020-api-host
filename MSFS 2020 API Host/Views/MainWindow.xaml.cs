using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Timers;
using System.Windows.Media;

namespace JohnPenny.MSFS.SimConnectManager.REST.Views
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();

            this.Top = SystemParameters.PrimaryScreenHeight /2 - this.Height /2;
            this.Left = 0;

            windowInteropHelper = new WindowInteropHelper(this);

            timer = new Timer();
            timer.Interval = 4000;
            timer.Elapsed += OnTick;
        }

        private readonly WindowInteropHelper windowInteropHelper;
        private readonly Timer timer;
        private readonly Brush restColorON = Brushes.GreenYellow;
        private readonly Brush restColorOFF = Brushes.IndianRed;
        private readonly Brush simColorON = Brushes.GreenYellow;
        private readonly Brush simColorOFF = Brushes.IndianRed;

        public IntPtr GetHandle()
        {
            return windowInteropHelper.Handle;
        }

        public HwndSource GetHandleSource()
        {
            // BUG LOW fails on first run on machine
            return HwndSource.FromHwnd(windowInteropHelper.Handle);
        }

        private void OnTick(object source, ElapsedEventArgs e)
        {
            // currently not doing state checks due to threading challenges
        }

        public void ReportSimConnectConnected()
        {
            simStatus.Foreground = simColorON;
        }

        public void ReportSimConnectDisconnected()
        {
            simStatus.Foreground = simColorOFF;
        }

        public void ReportASPRunning()
        {
            restStatus.Foreground = restColorON;
        }

        public void ReportASPStopped()
        {
            restStatus.Foreground = restColorOFF;
        }

        private void Quit(object sender, RoutedEventArgs e)
        {
            Close(); // will just close the app as this is the main window
        }

        private void Min(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void MoveGrabber(object sender, MouseButtonEventArgs e)
        {
            if (Mouse.LeftButton == MouseButtonState.Pressed)
                DragMove();
        }
    }
}
