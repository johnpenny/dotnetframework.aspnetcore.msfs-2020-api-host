//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;
using System.Runtime.InteropServices;
using Microsoft.FlightSimulator.SimConnect;

using JohnPenny.MSFS.SimConnectManager.REST;

namespace JohnPenny.MSFS.SimConnectManager
{
	public class SimConnectManager
	{
		public SimConnectManager()
		{
			Console.ForegroundColor = ConsoleColor.Green;
			Console.Write("\nSimConnectManager: ");
			Console.ResetColor();
			Console.Write($"REST API Running. \n");
		}

		public void Quit()
		{
			if (simConnect != null)
			{
				CloseConnection();
			}
		}

		// various possible data structs we can grab from SimConnect

		#region  @MOD struct - SimDataAircraft
		// ! you must keep the ORDER of these definitions identical in both the struct and the definition list

		[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi, Pack = 1)]
		public struct SimDataAircraft
		{
			#region HELP
			// http://www.prepar3d.com/SDKv5/sdk/references/variables/simulation_variables.html
			// Unless the Units column in the following table identifies the units as a structure or a string, the data will be returned by default in a signed 64 bit floating point value.(NOTE: 'double' in c#)
			// When the units are listed as a structure or as a string, enter the empty string, or simply NULL, in the units parameter.
			#endregion

			[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] // fixed size string
			public String title; // title string  (pass null) (title from aircraft.cfg) 

			[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] // fixed size string
			public String flightNumber; // ATC FLIGHT NUMBER string (pass null)
			[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] // fixed size string
			public String tailNumber; // ATC ID string (pass null)
			[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] // fixed size string
			public String craftType; // ATC TYPE string (pass null)
			[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] // fixed size string
			public String craftModel; // ATC MODEL string (pass null)

			public double isOnGround; // SIM ON GROUND bool
			public double latitude; //GPS POSITION LAT degrees
			public double longitude; //GPS POSITION LON degrees
			public double heading; // MAGNETIC COMPASS degrees

			public double planeAltitude; // PLANE ALTITUDE feet
			public double groundAltitude; // GROUND ALTITUDE meters

			public double roll; // PLANE BANK DEGREES radians
			public double pitch; // PLANE PITCH DEGREES radians
			// YAW == heading

			public double airspeedTrue; // AIRSPEED TRUE knots
			public double airspeedIndicated; // AIRSPEED INDICATED knots
			public double airspeedMach; // AIRSPEED MACH mach
			public double groundSpeed; // GROUND VELOCITY knots
		};
		#endregion

		//

		/// <summary>
		/// The data package to request; Will have a matching associated data struct
		/// </summary>
		public enum DataStructName
		{
			// ! should match the struct name; remember the define new structs in setup!
			NONE = 0,
			SimDataAircraft, // produces a datasheet for the sim aircraft - perfect for getting data on the user
			SomeOtherStruct,
			SomeOtherStruct2,
		}

		/// <summary>
		/// ! Should be unique ! The name of the request, used both interally to check what an object is, and in SimConnect as a unique request ID
		/// </summary>
		public enum RequestName
		{
			// ! RequestDataOnSimObjectType arg RequestID; This value should be unique for each request, re-using a RequestID will overwrite any previous request using the same ID.
			DummyUser = -1, // not a sim object, but will be treated as a demo 'User' object locally. Will contain dummy data to look like the 'User' request
			NONE = 0, // marked not a sim object (used in the REST API to sort sim and non sim objects)
			User = 1, // RETURNS: a SimDataAircraft for the user plane
			IdeaAircraftNearMe, // RETURNS: NOT REAL could return a list of aircraft nearby?
			IdeaWeatherReport, // RETURNS: NOT REAL could contain a weather report from inside the game?
			SomeUniqueThingRequest, // add more, you dont need to assign values - obviously you must also create the struct and data binds and API layer
			SomeUniqueThingRequest2,
		};

		// cached returned sim data - try to name these to signify the use of the unique request name eg for User have UserRequestReturnedData

		public SimDataAircraft UserRequestReturnedData;

		// SimConnect API

		#region HELP
		// NOTES ON HANDLE:
		// The handle must be gathered from an active window class:  IntPtr handle = new WindowInteropHelper(this).Handle;
		// Then the source must be determined:  HwndSource handleSource = HwndSource.FromHwnd(handle);
		// Then a method must be passed to hook in: handleSource.AddHook(simConnectManager.HandleSimConnectEvents);
		// Remember to unbind on quit with handleSource.RemoveHook(simConnectManager.HandleSimConnectEvents);
		#endregion

		//private IntPtr handle;
		//private HwndSource handleSource;
		private const int WM_USER_SIMCONNECT = 0x0402; // User-defined win32 event
		private SimConnect simConnect;
		private string simConnectAppName;

		// status

		public bool isSetUp;
		public bool[] awaitSimConnectRequests = new bool[Enum.GetNames(typeof(RequestName)).Length];

		// methods

		public bool SetUp() // Set up all the SimConnect related data definitions and event handlers
		{
			if (isSetUp) return true; // already set up

			// try connect

			try
			{
				simConnect = new SimConnect("Managed Data Request", Program.Handle, WM_USER_SIMCONNECT, null, 0);
			}
			catch (COMException x)
			{
				Console.ForegroundColor = ConsoleColor.Red;
				Console.Write("\nSimConnectManager: ");
				Console.ResetColor();
				//Console.Write($"{x} \n"); // it is pointless printing this as 99% of the time this is just the SC service not running
				Console.Write($"Connection setup FAILED - Please Start MSFS2020 \n");
				return false;
			}

			// set up data struct definition & registration

			try
			{
				#region  @MOD struct definition & registration - SimDataAircraft
				// ! you must keep the ORDER of these definitions identical in both the struct and the definition list

				simConnect.ClearDataDefinition(DataStructName.SimDataAircraft);


				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "TITLE", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "ATC FLIGHT NUMBER", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "ATC ID", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "ATC TYPE", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "ATC MODEL", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "SIM ON GROUND", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "GPS POSITION LAT", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "GPS POSITION LON", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "MAGNETIC COMPASS", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "PLANE ALTITUDE", "feet", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "GROUND ALTITUDE", "meters", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "PLANE BANK DEGREES", "radians", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "PLANE PITCH DEGREES", "radians", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "AIRSPEED TRUE", "knots", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "AIRSPEED INDICATED", "knots", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "AIRSPEED MACH", "mach", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
				simConnect.AddToDataDefinition(DataStructName.SimDataAircraft, "GROUND VELOCITY", "knots", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

				simConnect.RegisterDataDefineStruct<SimDataAircraft>(DataStructName.SimDataAircraft); // register the struct definition
				#endregion

				// ... define more - copy and paste the above region
			}
			catch (COMException x)
			{
				Console.ForegroundColor = ConsoleColor.Red;
				Console.Write("\nSimConnectManager: ");
				Console.ResetColor();
				Console.Write($"Data definition setup FAILED: {x} \n");
				return false;
			}

			// bind events

			simConnect.OnRecvOpen += OnReceiveEventOpen;
			simConnect.OnRecvQuit += OnReceiveEventClosed;
			simConnect.OnRecvSimobjectDataBytype += OnReceiveSimData;
			simConnect.OnRecvException += OnReceiveEventException;

			Console.ForegroundColor = ConsoleColor.Green;
			Console.Write("\nSimConnectManager: ");
			Console.ResetColor();
			Console.Write($"Setup SUCCESS \n");

			Program.DispatchToWPFApplication(() => Program.mainWindow.ReportSimConnectConnected()); // dispatch the status change to the WPF thread

			isSetUp = true;
			return isSetUp;
		}
		
		public void RequestSimData(RequestName requestName, DataStructName dataStructName)
		{
			#region HELP
			// RequestID: Specifies the ID of the client defined request. This is used later by the client to identify which data has been received. This value should be unique for each request, re-using a RequestID will overwrite any previous request using the same ID.

			// DefineID: Specifies the ID of the client defined data definition.

			// dwRadiusMeters: Double word containing the radius in meters.If this is set to zero only information on the user aircraft will be returned, although this value is ignored if type is set to SIMCONNECT_SIMOBJECT_TYPE_USER.The error SIMCONNECT_EXCEPTION_OUT_OF_BOUNDS will be returned if a radius is given and it exceeds the maximum allowed(200000 meters, or 200 Km).

			// type: Specifies the type of object to receive information on.One member of the SIMCONNECT_SIMOBJECT_TYPE enumeration type.

			// user example: simConnect.RequestDataOnSimObjectType(requestType, dataType, 0, SIMCONNECT_SIMOBJECT_TYPE.USER);
			#endregion

			switch (dataStructName) // which DataStructName data struct is being requested?
			{
				case DataStructName.SimDataAircraft:
					{
						switch (requestName) // which RequestName request is being requested?
						{
							case RequestName.User:
								{
									// must abort if we hit a return rate limit, as the SimConnect API will just overwrite duplicates which would hang the REST API
									if (awaitSimConnectRequests[(int)requestName]) return; // abort
									simConnect.RequestDataOnSimObjectType(requestName, dataStructName, 0, SIMCONNECT_SIMOBJECT_TYPE.USER);
									awaitSimConnectRequests[(int)requestName] = true;
									break;
								}
							default:
								{
									// unknown request name, ignore
									break;
								}
						}
						break;
					}
				default:
					{
						// unknown data type, ignore
						break;
					}
			}
		}

		private void OnReceiveSimData(SimConnect sender, SIMCONNECT_RECV_SIMOBJECT_DATA_BYTYPE data)
		{
			switch ((DataStructName)data.dwDefineID) // which DataStructName data struct is being returned?
			{
				case DataStructName.SimDataAircraft:
					{
						switch ((RequestName)data.dwRequestID) // which RequestName request is being returned?
						{
							case RequestName.User:
								{
									UserRequestReturnedData = (SimDataAircraft)data.dwData[0]; // write out
									awaitSimConnectRequests[data.dwRequestID] = false;
									break;
								}
							default:
								{
									// unknown request name, ignore
									break;
								}
						}
						break;
					}
				case DataStructName.SomeOtherStruct:
					{
						break;
					}
				case DataStructName.SomeOtherStruct2:
					{
						break;
					}
				default:
					{
						// unknown data type, ignore
						break;
					}
			}
		}

		private void OnReceiveEventOpen(SimConnect sender, SIMCONNECT_RECV_OPEN data)
		{
			simConnectAppName = $"'{data.szApplicationName}'";

			Console.ForegroundColor = ConsoleColor.Blue;
			Console.Write("\nSimConnect: ");
			Console.ResetColor();
			Console.Write($"OnReceiveEventOpen : SIMCONNECT_RECV_OPEN : CONNECTION TO APP OPENED : {simConnectAppName}\n");
		}

		private void OnReceiveEventClosed(SimConnect sender, SIMCONNECT_RECV data)
		{
			CloseConnection();

			Console.ForegroundColor = ConsoleColor.Blue;
			Console.Write("\nSimConnect: ");
			Console.ResetColor();
			Console.Write($"OnReceiveEventClosed : SIMCONNECT_RECV : CONNECTION TO APP CLOSED : {simConnectAppName} \n");

			simConnectAppName = "";
		}

		private void OnReceiveEventException(SimConnect sender, SIMCONNECT_RECV_EXCEPTION data)
		{
			string x = (data.dwException == SIMCONNECT_RECV_EXCEPTION.UNKNOWN_INDEX) ? "UNKNOCWN_INDEX" : "UNKNOWN_SENDID"; // dont do this hah im just being lazy

			Console.ForegroundColor = ConsoleColor.Red;
			Console.Write("\nSimConnect: ");
			Console.ResetColor();
			Console.Write($"OnReceiveEventException : SIMCONNECT_RECV_EXCEPTION : {x} \n");
		}

		public IntPtr HandleSimConnectEvents(IntPtr hWnd, int message, IntPtr wParam, IntPtr lParam, ref bool isHandled)
		{
			if (!isSetUp) return IntPtr.Zero;
			isHandled = false;

			if (message == WM_USER_SIMCONNECT) // for us
			{
				if (simConnect != null) // process it
				{
					try
					{
						simConnect.ReceiveMessage();
						isHandled = true;

						Console.ForegroundColor = ConsoleColor.Green;
						Console.Write("\nSimConnect: ");
						Console.ResetColor();
						Console.Write($"SimConnect.ReceiveMessage : received & handled \n");
					}
					catch (COMException x)
					{
						Console.ForegroundColor = ConsoleColor.Red;
						Console.Write("\nSimConnect: ");
						Console.ResetColor();
						Console.Write($"SimConnect.ReceiveMessage : EXCEPTION : {x} \n");
					}
				}
			}

			return IntPtr.Zero;
		}

		private void CloseConnection()
		{
			// TODO test and implement a safe and complete start/stop process for SC - forced reconnect / incidental disconnect
			isSetUp = false;
			simConnect.OnRecvOpen -= OnReceiveEventOpen;
			simConnect.OnRecvQuit -= OnReceiveEventClosed;
			simConnect.OnRecvSimobjectDataBytype -= OnReceiveSimData;
			simConnect.OnRecvException -= OnReceiveEventException;
			if (simConnect != null) simConnect = null;

			Program.DispatchToWPFApplication(() => Program.mainWindow.ReportSimConnectDisconnected()); // dispatch the status change to the WPF thread
		}
	}
}
