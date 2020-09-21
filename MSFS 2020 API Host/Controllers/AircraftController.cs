//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using System;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;

using JohnPenny.MSFS.SimConnectManager.REST.Interfaces;
using JohnPenny.MSFS.SimConnectManager.REST.Models;

namespace JohnPenny.MSFS.SimConnectManager.REST.Controllers
{
	[ApiController]
	[Route("/[controller]")]
	public class AircraftController : ControllerBase
	{
		public AircraftController(IDataRepository<Aircraft> repository)
		{
			aircraftRepository = repository;
		}

		private readonly IDataRepository<Aircraft> aircraftRepository;

		//

		public enum ErrorCode
		{
			ItemStructureInvalid,
			ItemNameAlreadyTaken,
			RecordNotFound,
			CouldNotCreateItem,
			CouldNotUpdateItem,
			CouldNotDeleteItem,
			CouldNotDeleteItemIsASimObject,
			CouldNotDeleteItemInvalidGUID,
			CannotReadSimObjectWithoutConnection,
		}

		public enum OKCode // for action feedbacks
		{
			ItemFound,
			ItemDeleted,
		}

		//

		/// <summary>
		/// Try to sync this item's data, and request more for the next call.
		/// </summary>
		/// <param name="existingItem"></param>
		/// <returns>Enum: error/ok status</returns>
		public Enum DoSimConnectSync(Aircraft existingItem)
		{
			if (existingItem == null) return ErrorCode.RecordNotFound;
			if (existingItem.LocalSimRequestType != SimConnectManager.RequestName.NONE && existingItem.LocalSimRequestType != SimConnectManager.RequestName.DummyUser)
			{
				// is real sim object - check status of the sim connection before proceeding
				if (!Program.simConnectManager.SetUp()) return ErrorCode.CannotReadSimObjectWithoutConnection; // setup failed, try again and report
			}

			switch (existingItem.LocalSimRequestType) // check if this sim object has an implemented bind
			{
				case SimConnectManager.RequestName.NONE: // no relevant request type or not a sim object
					{
						break;
					}
				case SimConnectManager.RequestName.DummyUser:
					{
						aircraftRepository.Update(new Aircraft()
						{
							LocalItem = existingItem.LocalItem,
							LocalDescription = existingItem.LocalDescription,
							LocalGUID = existingItem.LocalGUID,
							LocalSimRequestType = existingItem.LocalSimRequestType,

							Title = "A title! " + Guid.NewGuid().ToString("n").Substring(0, 8),

							FlightNumber = Guid.NewGuid().ToString("n").Substring(0, 8),
							TailNumber = Guid.NewGuid().ToString("n").Substring(0, 8),
							CraftType = Guid.NewGuid().ToString("n").Substring(0, 8),
							CraftModel = Guid.NewGuid().ToString("n").Substring(0, 8),

							//52.403331,-1.5385686
							IsOnGround = (Program.random.Next(0, 9) > 4) ? double.MaxValue : double.MinValue,
							Latitude = 52.403331 + (Program.lifeTimer.Elapsed.TotalMilliseconds * (-0.0000001)),
							Longitude = -1.5385686 + (Program.lifeTimer.Elapsed.TotalMilliseconds * (0.0000001)),
							Heading = (existingItem.Heading == 359) ? 0 : existingItem.Heading + 0.5,

							PlaneAltitude = (Math.Sin(Program.lifeTimer.Elapsed.TotalMilliseconds * 2 * Math.PI / 100000) * (15000 / 2) + (15000 / 2)),
							//PlaneAltitude = 0,
							GroundAltitude = 0,

							Roll = (existingItem.Roll > 6.28319) ? 0 : existingItem.Roll + 0.01,
							Pitch = 0,
							Yaw = 0, // unused

							AirspeedTrue = Program.random.NextDouble(),
							AirspeedIndicated = Program.random.NextDouble(),
							AirspeedMach = Program.random.NextDouble(),
							GroundSpeed = Program.random.NextDouble(),
						});

						Console.ForegroundColor = ConsoleColor.DarkGray;
						Console.Write("\nSimConnectManager: ");
						Console.ResetColor();
						Console.Write($"Generating dummy data for dummy user : '{existingItem.LocalSimRequestType}' \n");

						break;
					}
				case SimConnectManager.RequestName.User:
					{
						#region @MOD API - sync data
						aircraftRepository.Update(new Aircraft()
						{
							LocalItem = existingItem.LocalItem,
							LocalDescription = existingItem.LocalDescription,
							LocalGUID = existingItem.LocalGUID,
							LocalSimRequestType = existingItem.LocalSimRequestType,

							Title = Program.simConnectManager.UserRequestReturnedData.title,

							FlightNumber = Program.simConnectManager.UserRequestReturnedData.flightNumber,
							TailNumber = Program.simConnectManager.UserRequestReturnedData.tailNumber,
							CraftType = Program.simConnectManager.UserRequestReturnedData.craftType,
							CraftModel = Program.simConnectManager.UserRequestReturnedData.craftModel,

							IsOnGround = Program.simConnectManager.UserRequestReturnedData.isOnGround,
							Latitude = Program.simConnectManager.UserRequestReturnedData.latitude,
							Longitude = Program.simConnectManager.UserRequestReturnedData.longitude,
							Heading = Program.simConnectManager.UserRequestReturnedData.heading,

							PlaneAltitude = Program.simConnectManager.UserRequestReturnedData.planeAltitude,
							GroundAltitude = Program.simConnectManager.UserRequestReturnedData.groundAltitude,

							Roll = Program.simConnectManager.UserRequestReturnedData.roll,
							Pitch = Program.simConnectManager.UserRequestReturnedData.pitch,
							Yaw = Program.simConnectManager.UserRequestReturnedData.heading, // YAW == heading

							AirspeedTrue = Program.simConnectManager.UserRequestReturnedData.airspeedTrue,
							AirspeedIndicated = Program.simConnectManager.UserRequestReturnedData.airspeedIndicated,
							AirspeedMach = Program.simConnectManager.UserRequestReturnedData.airspeedMach,
							GroundSpeed = Program.simConnectManager.UserRequestReturnedData.groundSpeed,
						});
						#endregion

						// feedback
						Console.ForegroundColor = ConsoleColor.DarkGray;
						Console.Write("\nSimConnectManager: ");
						Console.ResetColor();
						Console.Write($"Processing SimConnect data : '{existingItem.LocalSimRequestType}' \n");

						Console.ForegroundColor = ConsoleColor.DarkGray;
						Console.Write("\nSimConnectManager: ");
						Console.ResetColor();
						Console.Write($"Requested new SimConnect data : '{existingItem.LocalSimRequestType}' \n");

						// request new SimConnect data for next API request (so always reporting one tick behind)
						Program.simConnectManager.RequestSimData(existingItem.LocalSimRequestType, SimConnectManager.DataStructName.SimDataAircraft);

						break;
					}
			}

			return OKCode.ItemFound;
		}

		[HttpGet]
		[Route("/[controller]")]
		[Route("/[controller]/{i?}")]
		[Route("/[controller]/{i?}/{d?}")]
		public IActionResult HandleURI(string i, string d)
		{
			if(string.IsNullOrEmpty(i) && string.IsNullOrEmpty(d)) return Ok(aircraftRepository.All); // 200 && print item list as json

			Aircraft item = aircraftRepository.Find(i);
			Enum syncCode = DoSimConnectSync(item);

			switch (syncCode)
			{
				case OKCode.ItemFound:
					{
						if (string.IsNullOrEmpty(d)) // item request
						{
							return Ok(item); // 200 && print item data as json
						}
						else // data request
						{
							PropertyInfo p = typeof(Aircraft).GetProperty(d, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase); // search and ignore case
							if (p == null) return NotFound(ErrorCode.RecordNotFound.ToString()); // no such property
							return Ok(p.GetValue(item).ToString()); // 200 && print raw data
						}
					}
				case ErrorCode.CannotReadSimObjectWithoutConnection:
				case ErrorCode.RecordNotFound:
				default:
					{
						return NotFound(syncCode.ToString()); // 404 && print error
					}
			}
		}

		[HttpPost]
		public IActionResult Create([FromBody] Aircraft item)
		{
			return NoContent();
			//try
			//{
			//    if (item == null || !ModelState.IsValid)
			//    {
			//        return BadRequest(ErrorCode.ItemStructureInvalid.ToString());
			//    }
			//    bool itemExists = _repository.DoesItemExist(item.R_Item);
			//    if (itemExists)
			//    {
			//        return StatusCode(StatusCodes.Status409Conflict, ErrorCode.ItemNameAlreadyTaken.ToString());
			//    }
			//    _repository.Insert(item);
			//}
			//catch (Exception)
			//{
			//    return BadRequest(ErrorCode.CouldNotCreateItem.ToString());
			//}
			//return Ok(item);
		}

		[HttpPut]
		public IActionResult Edit([FromBody] Aircraft item)
		{
			return NoContent();
			//try
			//{
			//    if (item == null || !ModelState.IsValid)
			//    {
			//        return BadRequest(ErrorCode.ItemStructureInvalid.ToString());
			//    }
			//    var existingItem = _repository.Find(item.R_Item);
			//    if (existingItem == null)
			//    {
			//        return NotFound(ErrorCode.RecordNotFound.ToString());
			//    }
			//    if (item.R_SimObject) return BadRequest(ErrorCode.CouldNotDeleteItemIsASimObject.ToString());
			//    _repository.Update(item);
			//}
			//catch (Exception)
			//{
			//    return BadRequest(ErrorCode.CouldNotUpdateItem.ToString());
			//}
			//return NoContent();
		}

		[HttpDelete("/{guid}")] // allow deleting from the root if the right http method is used
		[HttpGet("/delete/{id}/{guid}")] // this API is for use with basic local network JS apps so this is fine
		public IActionResult Delete(string id, string guid)
		{
			try
			{
				var item = aircraftRepository.Find(id, matchCase: true); // make sure deletion is case sensitive
				if (item == null)
				{
					return NotFound(ErrorCode.RecordNotFound.ToString());
				}
				if (item.LocalSimRequestType == SimConnectManager.RequestName.NONE) return BadRequest(ErrorCode.CouldNotDeleteItemIsASimObject.ToString());
				if (item.LocalGUID.ToString() != guid) return BadRequest(ErrorCode.CouldNotDeleteItemInvalidGUID.ToString());
				aircraftRepository.Delete(id);
			}
			catch (Exception)
			{
				return BadRequest(ErrorCode.CouldNotDeleteItem.ToString());
			}
			return Ok(OKCode.ItemDeleted.ToString());
		}
	}
}
