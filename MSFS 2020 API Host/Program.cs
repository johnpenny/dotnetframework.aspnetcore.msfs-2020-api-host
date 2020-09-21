//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Windows;
using System.Windows.Interop;

using JohnPenny.MSFS.SimConnectManager.REST.Views;
using System.Diagnostics;

namespace JohnPenny.MSFS.SimConnectManager.REST
{
	// PROJECT NOTES:

	// Fresh project: start with the ASP Core web app template, then select .NET Framework and ASP Core, then select API, then when started edit (in Properties) target to framework 4.8
	// Add reference (Project>Add Project Reference) for SimConnect.dll from the SDK dir (SimConnect SDK\lib\managed\Microsoft.FlightSimulator.SimConnect.dll)
	// Add this build event (in Properties) in post build event command line: xcopy /D /Y "$(MSFS_SDK)SimConnect SDK\lib\SimConnect.dll" "$(TargetDir)"
	// Ensure we are building to x64, check the Properties build page

	// Its important to understand the use of the frankenstein WPF/Console/ASP application here, the SimConnect API requires an active window to receive windows messages, however the bulk of this app lends itself to a basic ASP console setup, so I have created an abomination.

	// Because we need a WPF window to handle events, we will need to import some libs that we usually wouldnt need in an ASP app
	// Right click on Dependencies and click Add Assembly Reference and ensure these are referenced:
	// PresentationCore
	// PresentationFramework
	// WindowBase
	// System.Xaml

	// When you copy in a Xaml Window the properties will mess up, you must click on the .xaml and in its properties window make sure the following are set:
	// Build Action: Page
	// Copy To Output Directory: Do not copy
	// Custom Tool: XamlIntelliSenseFileGenerator

	// More notes:
	// if the project keeps complaining that InitializeComponent does not exist, you need to ensure the Window xaml class sits under the default namespace of the app (Properties page)

	public class Program
	{

		// NOTE: configure the endpoints and app URL in appsettings.json within the kestrel object

		public static IntPtr Handle
		{
			get
			{
				if (handle != IntPtr.Zero) return handle;
				if (handleCQ.TryDequeue(out IntPtr i))
				{
					handle = i;
					return handle;
				}
				return IntPtr.Zero;
			}
		}

		public static HwndSource HandleSource
		{
			get
			{
				if (handleSource != null) return handleSource;
				if (handleSourceCQ.TryDequeue(out HwndSource i))
				{
					handleSource = i;
					return handleSource;
				}
				return null;
			}
		}

		public static Stopwatch lifeTimer = Stopwatch.StartNew();
		public static Random random = new Random();

		public static SimConnectManager simConnectManager = new SimConnectManager();

		private static IntPtr handle;
		private static HwndSource handleSource;

		private static readonly ConcurrentQueue<IntPtr> handleCQ = new ConcurrentQueue<IntPtr>();
		private static readonly ConcurrentQueue<HwndSource> handleSourceCQ = new ConcurrentQueue<HwndSource>();

		private static Application applicationWPF;
		public static MainWindow mainWindow;

		[STAThread] // needed to run WPF window
		public static void Main(string[] args)
		{
			Thread t2 = new Thread(new ThreadStart(StartWPFApplication));
			t2.TrySetApartmentState(ApartmentState.STA);
			t2.Start();

			while (applicationWPF == null || mainWindow == null) ; // wait for application and its window
			while (HandleSource == null) DispatchToWPFApplication(() => handleSourceCQ.Enqueue(mainWindow.GetHandleSource())); // wait for thread data
			while (Handle == IntPtr.Zero) DispatchToWPFApplication(() => handleCQ.Enqueue(mainWindow.GetHandle())); // wait for thread data
			HandleSource.AddHook(simConnectManager.HandleSimConnectEvents); // bind the window events to the method in the manager

			DispatchToWPFApplication(() => mainWindow.ReportASPRunning()); // just report ASP as running - if it fails recovery is just restarting anyway

			simConnectManager.SetUp();

			Console.ForegroundColor = ConsoleColor.DarkGray;
			Console.WriteLine("\n░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░\n");

			CreateWebHostBuilder(args).Build().Run();
			Quit();
		}

		private static void Quit()
		{
			HandleSource.RemoveHook(simConnectManager.HandleSimConnectEvents); // unbind
			simConnectManager.Quit(); // will perform a graceful disconnect
			Environment.Exit(0);
		}

		private static void StartWPFApplication()
		{
			applicationWPF = new Application();
			mainWindow = new MainWindow();
			//applicationWPF.ShutdownMode = ShutdownMode.OnExplicitShutdown; // not used as when you shut the app via taskbar etc the console must close too
			applicationWPF.Run(mainWindow);
			Quit();
		}

		public static void DispatchToWPFApplication(Action action)
		{
			applicationWPF.Dispatcher.Invoke(action);
		}

		public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
			WebHost.CreateDefaultBuilder(args)
			.UseStartup<Startup>();

	}
}
