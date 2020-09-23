# MSFS 2020 API Host
A REST API host for the Microsoft Flight Simulator 2020 SimConnect API - Including map overlay &amp; sync applet.

### State
The API host is working as described and stable, but not optimised or fully tested.

The code is a bit of a mess but relatively simple.

The map overlay applet is working on Win10 desktop Chrome browser, and is untested on any other platform.

There are many quirks and visual issues that should be simple to fix, but I don't have time right now; When I get spare time I will work through the following TODO lists.

##### TODO BROWSER Map Overlay
* Keep current journey in view option - to automatically keep the journey in the map bounds
* Hide query UI completely option
* Resolving some js quirks I fell into
* Rotational resets; make them unanimated
* Mobile viewport design / responsive / scale
##### TODO SERVER
* Server side journey log and journey API endpoints (will be working on this asap so journey data is preserved)
* Bookmarking from the windows widget window
* Stress testing
* More data structs with interesting SimConnect data


### Why Did You Make It?
While playing MSFS2020 I found myself wanting to see more about the place I was flying over. This tool allows me to do that.
It also allows other people with access to your networking to view your flight as it happens.

### How Do I Use It?

Runs on a windows with .NET runtime. Only tested on up to date Windows 10 machines.

The app requires trusting a localhost issued ssl certificate, and a firewall rule. If you don't want to - or can't - do either of those things then the app will not function.

* Download the project as a zip (Hit the green button up at the top right or use https://github.com/johnpenny/dotnetframework.aspnetcore.msfs-2020-api-host/archive/master.zip).
* Unzip the downloaded file; find the 'Run' directory, which contains everything you need to run the app (You may move and rename this directory).
* Find the application .exe and run it. (If it fails or crashes try running it again - there is a quirk I see on some machines where the first run fails to start the WPF window)
* Accept the firewall and certificate trust requests.
* Go to https://localhost:4380 in a browser to check out the content. I recommend viewing the map demo page first https://localhost:4380/map?demo=true.
* Now you can either run MSFS2020 and use it at localhost, or find your local network address (shown at the top of the homepage) and view the map from another computer.

It is important to note that when not running from localhost (or when the localhost cert expires) you will get warnings from web browsers telling you the connection is not secure.
While this is a bit of a lie (your connection is secure unless you connected via http for some reason) the browser is treating the server as it would any public web server, so it is in paranoid mode.
In Chrome you simply need to click 'Advanced' and view the page anyway.

To get the query data you will need a free https://geonames.org account.

### I like it, how can I help?
Firstly let me know you like it by starring it on github. I will dedicate more time to it if people use it.
Then go and express your thanks to the following projects whose data powers the map:
* https://openstreetmap.org
* https://geonames.org
* http://maps.stamen.com

### Roadmap
This is a weekend project, I will not be able to dedicate significant time to adding or fixing features, so I strongly recommend you clone and modify it if needed.

### Pull Requests
Accepted in principle, but I don't have time to check and test, so large changes are unlikely to be pulled quickly.

## Screenshots

![Screenshot 1](../promo/Promo/Screenshots/1.png?raw=true)
![Screenshot 2](../promo/Promo/Screenshots/2.png?raw=true)
![Screenshot 3](../promo/Promo/Screenshots/3.png?raw=true)
![Screenshot 4](../promo/Promo/Screenshots/4.png?raw=true)
![Screenshot 5](../promo/Promo/Screenshots/5.png?raw=true)
![Screenshot 6](../promo/Promo/Screenshots/6.png?raw=true)

## INFO

### Framework
* .NET Framework 4.8

### Packages Used
* ASP.NET Core 2.2.0
* https://leafletjs.com
* https://prismjs.com

### Other Libs
* SimConnect.dll
* Microsoft.FlightSimulator.SimConnect.dll (managed lib from MSFS2020 SDK)

### Data Sources
* https://openstreetmap.org
* https://geonames.org
* http://maps.stamen.com

### Other Assets
* https://material.io/resources/icons
