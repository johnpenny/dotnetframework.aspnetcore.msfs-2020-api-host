//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;
using System.ComponentModel.DataAnnotations;
using System.Configuration;

using JohnPenny.MSFS.SimConnectManager.REST.Interfaces;

namespace JohnPenny.MSFS.SimConnectManager.REST.Models
{
	[SettingsSerializeAs(SettingsSerializeAs.Xml)]
	public class Aircraft : IDataRepositoryItem<Aircraft>
	{
		[Required]
		public string LocalItem { get; set; }

		[Required]
		public string LocalDescription { get; set; }

		[Required]
		public Guid LocalGUID { get; set; }

		[Required]
		public SimConnectManager.RequestName LocalSimRequestType { get; set; } // sim object data bind && signifies readonly real data object if not set to NONE

		public string Title { get; set; }

		public string FlightNumber { get; set; }
		public string TailNumber { get; set; }
		public string CraftType { get; set; }
		public string CraftModel { get; set; }

		public double IsOnGround { get; set; }

		public double Latitude { get; set; }
		public double Longitude { get; set; }
		public double Heading { get; set; }

		public double PlaneAltitude { get; set; }
		public double GroundAltitude { get; set; }

		public double Roll { get; set; }
		public double Pitch { get; set; }
		public double Yaw { get; set; }

		public double AirspeedTrue { get; set; }
		public double AirspeedIndicated { get; set; }
		public double AirspeedMach { get; set; }
		public double GroundSpeed { get; set; }
	}
}
