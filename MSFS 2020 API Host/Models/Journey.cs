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
	public class Journey : IDataRepositoryItem<Journey>
	{
		[Required]
		public Guid GUID { get; set; }
	}
}
