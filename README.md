# Hej Youtube, whats going on in the world?

[![Cloud Player Teaser](./src/assets/cover.jpg)](https://live.cloud-player.io)

This is 22h hackathon project created at [ValHacks 2018](http://best.dtu.dk/hackathon/).
Browse the world and see all the livevideos that are broadcasted nearby the location on YouTube.

[Start the App](https://live.cloud-player.io)

## Technologies
[Microsoft Bing Maps V8 Control](https://www.microsoft.com/en-us/maps/v8-control) is used to let the user choose a location on the map. The [Microsoft Locations Api](https://msdn.microsoft.com/en-us/library/ff701715.aspx) 
is used to resolve the location into a Country name to display it in the header.

The selected location is send to the [Youtube Data Api](https://developers.google.com/youtube/v3/docs/) to get live videos that are currently broadcasted within a radius
of 1000km.

[timezonedb API](https://timezonedb.com/api) is used to get the current timezone of the selected location to show the current time in that country.

The application is build with [TypeScript](https://www.typescriptlang.org/) and [Angular5](https://angular.io/)
