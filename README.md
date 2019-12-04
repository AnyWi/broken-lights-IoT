# broken-lights-IoT
Automatic reporting of broken street lighting in City of Leiden

# Setup
Code is build and run using [OpenLayers bundle tutorial](https://openlayers.org/en/latest/doc/tutorials/bundle.html)

    $ git clone https://github.com/AnyWi/broken-lights-IoT.git
    $ cd broken-lights-IoT
  
    $ npm install --save-dev parcel-bundler
  
# Usage
In the first terminal start the caching server:

    $ bash ./caching-proxy.sh
  
Second terminal start the application:

    $ npm start
  
Now point your (Firefox) browser to http://localhost:1234 on which route.gpx will be displayed.

The GPX track and PoI are generated using [OSMTracker for Android](https://wiki.openstreetmap.org/wiki/OSMTracker_(Android))
