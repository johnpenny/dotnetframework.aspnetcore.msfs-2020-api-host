//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System.Collections.Generic;

namespace JohnPenny.MSFS.SimConnectManager.REST.Interfaces
{
	public interface IDataRepository<T>
	{
		List<T> Items { get; set; }
		bool DoesItemExist(string id);
		int Count { get; }
		IEnumerable<T> All { get; }
		T Find(string id, bool matchCase = false);
		void Insert(T item);
		void Update(T item);
		void Delete(string id);
	}
}
