//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;

namespace JohnPenny.MSFS.SimConnectManager.REST.Interfaces
{
	public interface IDataRepositoryItem<T>
	{
		Guid LocalGUID { get; set; }
	}
}
