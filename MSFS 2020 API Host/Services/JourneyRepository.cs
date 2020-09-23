//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;
using System.Collections.Generic;
using System.Linq;
using JohnPenny.MSFS.SimConnectManager.REST.Interfaces;
using JohnPenny.MSFS.SimConnectManager.REST.Models;

		// NOTES

		// CAPTURE OPTIONS
		// path resolution

		// DATA PATH
		// path LL (as geojson multipoint)
		// path Altitude (in meters)
		// path Roll (the only spatial value not captured in the LLA)

		// DATA SIM
		// craft type
		// flight number
		// tail number
		// engines on time
		// engines off time

		// RENDER TIME DATA (store with the other data so it can be used or overriden)
		// Shadow latitude offset
		// Wing span

		// NOTES ON RENDERING IN JS
		// We will be rendering the path in either full 3D or topdown 2D
		// topdown 2D will simply render altitude info in the shadow, and path and roll in a 2D line
		// roll will be projected into 2D around the path line, and can resemble nav light trails (left=red right=green)

		// it may be beneficial to actually store all these lines on the server, so the browser is just doing the render
		// that means we will have 4 lines: PATH, SHADOWPATH, ROLLRIGHT, ROLLLEFT all in geojson multipoint objects


		//A.4.  MultiPoints
		//Coordinates of a MultiPoint are an array of positions:
		//	{
		//		"type": "MultiPoint",
		//		"coordinates": [
		//			[100.0, 0.0],
		//			[101.0, 1.0]
		//		]
		//	}

namespace JohnPenny.MSFS.SimConnectManager.REST.Services
{
	public class JourneyRepository : IDataRepository<Journey>
	{
		public List<Journey> Items { get; set; }
		public bool locked;

		public JourneyRepository()
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

		public IEnumerable<Journey> All
		{
			get
			{
				return Items;
			}
		}

		public bool DoesItemExist(string id)
		{
			return Items.Any(item => item.GUID.ToString() == id.ToString());
		}

		public Journey Find(string id, bool matchCase = false)
		{
			lock (Items)
			{
				matchCase = true; // sanity check - always match case on GUID based lookups
				if (matchCase) return Items.FirstOrDefault(item => item.GUID.ToString() == id);
				return Items.FirstOrDefault(item => item.GUID.ToString().ToLower() == id.ToLower());
			}
		}

		public void Insert(Journey item)
		{
			Items.Add(item);
		}

		public void Update(Journey item)
		{
			lock (Items)
			{
				var dataItem = this.Find(item.GUID.ToString());
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
			Items = new List<Journey>();
			// TODO grab from JSON
		}
	}
}
