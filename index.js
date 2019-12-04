import 'ol/ol.css';
import {Map, View, Overlay}  from 'ol';
import {fromLonLat, transformExtent} from 'ol/proj';
import {bbox} from 'ol/loadingstrategy';
import {Tile as TileLayer} from 'ol/layer';
import {OSM, TileWMS} from 'ol/source';
import {Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource} from 'ol/source';
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style';
import {GeoJSON, GPX} from 'ol/format';
import {defaults as defaultControls, MousePosition, FullScreen, ZoomSlider} from 'ol/control';
import {createStringXY} from 'ol/coordinate';


var routeStyle = new Style({
  stroke: new Stroke({
    color: 'blue',
    width: 3
  }),
  image: new CircleStyle({
  	radius: 10,
  	fill: new Fill({color: 'rgba(255, 0, 0, 0.6)'}),
  	stroke: new Stroke({color: 'red', width: 1})
  }),
});

var style = new Style({
  image: new CircleStyle({
  	radius: 5,
  	fill: new Fill({color: 'rgba(0, 255, 0, 0.6)'}),
  	stroke: new Stroke({color: 'black', width: 1})
  }),
  text: new Text({
    offsetY: 12,
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: '#000'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 3
    })
  })
});

var routeLayer = new VectorLayer({
  source: new VectorSource({
    url: 'route.gpx',
    format: new GPX()
  }),
  style: function(feature) {
     //style.getText().setText(feature.get('object_number'));
     return routeStyle;
  },
});


/* Light locations of City of Leiden */
var moonSource = new VectorSource({
  format: new GeoJSON(),
  loader: function(extent, resolution, projection) {
     var t = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
     var proj = projection.getCode();
     // var url ='https://storing.moononline.nl/map/objects.php?' + 
     // Quirck to deal with cookie requirements to fetch information
     var url ='http://localhost:4000/map/objects.php?' + 
	'cor1=' + t[1] + '&cor2=' + t[3] + '&cor3=' + t[0] + '&cor4=' + t[2];
     var xhr = new XMLHttpRequest();
     xhr.open('GET', url);
     var onError = function() {
       moonSource.removeLoadedExtent(extent);
     }
     xhr.onerror = onError;
     xhr.onload = function() {
       if (xhr.status == 200) {
         moonSource.addFeatures(
             moonSource.getFormat().readFeatures(xhr.responseText, 
		{extent: extent, featureProjection: projection}));
       } else {
         onError();
       }
     }
     xhr.send();
   },
   strategy: bbox
 });


var moonLayer = new VectorLayer({
  source: moonSource,
  style: function(feature) {
    style.getText().setText(feature.get('object_number'));
    return style;
  },
  minZoom: 17,
});

var moonTile =  new TileLayer({
	source: new TileWMS({
		// url: 'https://storing.moononline.nl/map/tiles.php',
		/* Quirk for loading URL since cookie seems to be required */
     		url: 'http://localhost:4000/map/tiles.php',
		params: { 'LAYERS': 'objecten', 'VERSION': '1.1.1' },
		transition: 0,
		projection: 'EPSG:4326',
		/* Quirck allow loading layers, parameters seems to be case
		 * sensitive and also cannot be URL encoded 
		 */
		tileLoadFunction: function(imageTile, src) {
			var t = src;
			t = t.replace(/%2C/g,',');
			t = t.replace('VERSION', 'version');
			t = t.replace('FORMAT', 'format');
			t = t.replace('HEIGHT', 'height');
			t = t.replace('WIDTH', 'width');
			t = t.replace('REQUEST', 'request');
			t = t.replace('TRANSPARENT', 'transparant');
			t = t.replace('SRS', 'srs');
			t = t.replace('STYLES', 'styles');
			t = t.replace('LAYERS', 'layers');
			t = t.replace('SERVICE', 'service');
			t = t.replace('BBOX', 'bbox');

  			imageTile.getImage().src = t;
		},
	}),
	maxZoom: 17,
    })


const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM({
	url: 'http://{a-c}.localhost:4000/{z}/{x}/{y}.png',
      }),
    }),
    moonLayer,
    moonTile,
    routeLayer,
/* Do not care on display of boundries, FYI: merging those on OSM tiles would
 * really speed-up loading the map */ 
//    new TileLayer({
//	source: new TileWMS({
//		url: '//geodata.nationaalgeoregister.nl/bestuurlijkegrenzen/wms',
//		params: { 'LAYERS': 'provincies'},
//		transition: 0,
//	})
//    }),
//    new TileLayer({
//	source: new TileWMS({
//		url: '//geodata.nationaalgeoregister.nl/bestuurlijkegrenzen/wms',
//		params: { 'LAYERS': 'gemeenten'},
//		transition: 0,
//	})
//    }),

  ],
  view: new View({
    center: fromLonLat([4.50628, 52.14636]),
    zoom: 19,
    maxZoom: 18,
  }),

  controls: defaultControls().extend([
    new FullScreen(),
    new MousePosition({
	coordinateFormat: createStringXY(6),
	projection: 'EPSG:4326',
	className: 'custom-mouse-position',
	undefinedHTML: 'Not Available'
    }),
    new ZoomSlider(),
  ])
});

window.debugRouterLayer = routeLayer;

routeLayer.addEventListener("change", function () {
    map.getView().fit(routeLayer.getSource().getExtent(), 
      {size: map.getSize(), padding: [100, 100, 100, 100]});
})


var element = document.getElementById('popup');

var popup = new Overlay({
  element: element,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -50]
});
map.addOverlay(popup);

// display popup on click
map.on('click', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel,
    function(feature) {
      return feature;
    });
  if (feature) {
    var coordinates = feature.getGeometry().getCoordinates();
    popup.setPosition(coordinates);
    $(element).popover({
      placement: 'top',
      html: true,
      content: feature.get('popupContent')
    });
    $(element).popover('show');
  } else {
    $(element).popover('destroy');
  }
});
