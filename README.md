# MSFS 2020 API Host
*Info for devs is below*

## For Gamers
This project includes a build (in the 'Run' directory) with a map overlay web app included. You can run the .exe and view a map with details of your in-game flight from any browser that can contact your PC.

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

To get the query data you will need a free https://geonames.org account. Once you verify your email address, go to your account page and enable free web services, then enter your username into the map options menu.

### Why Did You Make It?
While playing MSFS2020 I found myself wanting to see more about the place I was flying over. This tool allows me to do that.

It also allows other people (with access to your network) to view an MSFS 2020 flight, which is just plain cool.

---

## Screenshots

![Screenshot 1](../promo/Promo/Screenshots/1.png?raw=true)
![Screenshot 2](../promo/Promo/Screenshots/2.png?raw=true)
![Screenshot 3](../promo/Promo/Screenshots/3.png?raw=true)
![Screenshot 4](../promo/Promo/Screenshots/4.png?raw=true)
![Screenshot 5](../promo/Promo/Screenshots/5.png?raw=true)
![Screenshot 6](../promo/Promo/Screenshots/6.png?raw=true)

---

## For Devs
A REST API host for the Microsoft Flight Simulator 2020 SimConnect API.

### State
The API host is working as described and stable, but not optimised or fully stress tested.

The map overlay applet is working on Win10 desktop Chrome browser, and is untested on any other platform.

### Goals

* A template for SimConnect -> REST API -> live data endpoint (R)
* A template for SimConnect -> REST API -> journey log endpoint (RW)
* A live map web app that shows your current flight on a nice map
* A journey map web app that shows your logged journeys on a nice map
* A console applet for map providers with open centering APIs
&nbsp;
* NOT SimConnect WRITE - I won't be templating this

##### TODO Browser Map Overlay
* Keep current journey in view option - to automatically keep the journey in the map bounds
* Hide query UI completely option
* Resolving some js quirks I fell into
* Rotational resets; make them unanimated
* Mobile viewport design / responsive / scale -- do some basic mitigation and scaling

##### TODO Server Host
* Server side journey log and journey API endpoints (will be working on this asap so journey data is preserved)
* Bookmarking from the windows widget window
* Stress testing multi client requests && multi SimConnect requests
* More data structs with interesting SimConnect data

### I like it, how can I help?
Let me know you like it by starring it on github. Also let me know if you make anything cool using this as a starting point.

If you find a bug log an issue on Github.

In terms of development of the map overlay app: I intend to create the live map and journey history map and then stop developing the project. There isn't a huge amount left to do, I just need to polish and optimise everything. I also need to refactor the JS.

### Roadmap
This is a weekend project, I will not be able to dedicate significant time to adding or fixing features, so I strongly recommend you clone and modify it if needed.

### Pull Requests
Accepted in principle, but I don't have much time to check and test, so large changes are unlikely to be pulled quickly.

---

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
