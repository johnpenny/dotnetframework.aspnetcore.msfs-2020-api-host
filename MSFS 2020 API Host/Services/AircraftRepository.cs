//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;
using System.Collections.Generic;
using System.Linq;
using JohnPenny.MSFS.SimConnectManager.REST.Interfaces;
using JohnPenny.MSFS.SimConnectManager.REST.Models;

namespace JohnPenny.MSFS.SimConnectManager.REST.Services
{
	public class AircraftRepository : IDataRepository<Aircraft>
	{
		public List<Aircraft> Items { get; set; }
		public bool locked;

		public AircraftRepository()
		{
			InitializeData();
		}

		public int Count
		{
			get
			{
				return Items.Count;
			}
		}

		public IEnumerable<Aircraft> All
		{
			get
			{
				return Items;
			}
		}

		public bool DoesItemExist(string id)
		{
			return Items.Any(item => item.LocalItem.ToLower() == id.ToLower());
		}

		public Aircraft Find(string id, bool matchCase = false)
		{
			lock (Items)
			{
				if (matchCase) return Items.FirstOrDefault(item => item.LocalItem == id);
				return Items.FirstOrDefault(item => item.LocalItem.ToLower() == id.ToLower());
			}
		}

		public void Insert(Aircraft item)
		{
			Items.Add(item);
		}

		public void Update(Aircraft item)
		{
			lock (Items)
			{
				var dataItem = this.Find(item.LocalItem);
				var index = Items.IndexOf(dataItem);
				Items.RemoveAt(index);
				Items.Insert(index, item);
			}
		}

		public void Delete(string id)
		{
			Items.Remove(this.Find(id));
		}

		private void InitializeData()
		{
			Items = new List<Aircraft>();

			Items.AddRange(new Aircraft[] {
				new Aircraft {
					GUID = Guid.NewGuid(),

					LocalItem = "User",
					LocalDescription = "The aircraft the user is inside within MSFS 2020.",
					LocalSimRequestType = SimConnectManager.RequestName.User,

					Title = "UNSET",

					FlightNumber =  "UNSET",
					TailNumber =  "UNSET",
					CraftType =  "UNSET",
					CraftModel =  "UNSET",

					IsOnGround = 0,
					Latitude = 0,
					Longitude = 0,
					Heading = 0,

					PlaneAltitude = 0,
					GroundAltitude = 0,

					Roll = 0,
					Pitch = 0,
					Yaw = 0,

					AirspeedTrue = 0,
					AirspeedIndicated = 0,
					AirspeedMach = 0,
					GroundSpeed = 0,
				},

				new Aircraft
				{
					GUID = Guid.NewGuid(),

					LocalItem = "Dummy",
					LocalDescription = "Will fill with random data (not useful) even if the sim connection is not live. For testing.",
					LocalSimRequestType = SimConnectManager.RequestName.DummyUser,

					Title = "UNSET",

					FlightNumber =  "UNSET",
					TailNumber =  "UNSET",
					CraftType =  "UNSET",
					CraftModel =  "UNSET",

					IsOnGround = 0,
					Latitude = 0,
					Longitude = 0,
					Heading = 0,

					PlaneAltitude = 0,
					GroundAltitude = 0,

					Roll = 0,
					Pitch = 0,
					Yaw = 0,

					AirspeedTrue = 0,
					AirspeedIndicated = 0,
					AirspeedMach = 0,
					GroundSpeed = 0,
				}

			});
		}
	}
}
