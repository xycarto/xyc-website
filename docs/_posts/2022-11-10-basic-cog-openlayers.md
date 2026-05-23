---
layout: post
title:  "Basic COG in Openlayers: Single Band Tif"
date:   2022-11-10
tags:   [Openlayers, GDAL, JavaScript, Geospatial]
---

This post covers loading a raw COG Tif and manipulating the values in JS. If you are unfamiliar with the COG Tif format, [see here for an explanation](https://www.cogeo.org/). Openlayers has a few [good examples](https://openlayers.org/en/latest/examples/cog.html) on how to load COGs. Some of this is a repeat of their examples and some goes a little more in depth.

- Example site is running [here](https://xycarto.github.io/cog-load-demo/)
- Github repo is [here](https://github.com/xycarto/cog-load-demo)

The following will cover:

1. Loading a COG via Openlayers 6
2. Demonstration of a pop-up to query the COG value

**Data used in the site:**

1. Sea Surface Temperature (SST) from [JPL](https://podaac.jpl.nasa.gov/SeaSurfaceTemperature), clipped to New Zealand EEZ
2. LINZ Aerial Imagery Basemap — I highly suggest you get your own link from [here](https://basemaps.linz.govt.nz/#@-41.8899962,174.0492437,z5)

**A few notes:**

1. The COG and the website are built using Web Mercator projection, so there are no special steps to build the site with regards to projection
2. I am only covering the JS in this example — see the [full HTML/CSS/JS example here](https://github.com/xycarto/cog-load-demo)

## Creating the COG

There are many tutorials out there on creating a COG. I am not going to repeat these. Instead, I am providing a link to a COG I created. The COG used in this example was created using a standard Python build like:

```python
creation_options = [
    "BIGTIFF=YES",
    "BLOCKSIZE=512",
    "RESAMPLING=BILINEAR",
    "COMPRESS=DEFLATE",
    "NUM_THREADS=ALL_CPUS"
]

gdal.Translate(    
    "clipped-eez-nztm-20200101090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02_fill_cut_warp_cog.tif",
    "warp_anti.tif",
    format = "COG",
    callback = gdal.TermProgress_nocb,
    creationOptions = creation_options
)
```

The COG is hosted on S3 with a public link:

```
https://d3cywq4ybqu7io.cloudfront.net/cogs/sst/clipped-eez-nztm-20200101090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02_fill_cut_warp_cog.tif
```

## Loading a Raw COG Tif

**Step 1** — Set the URL to the COG and load it as a source:

```javascript
var urls3 = 'https://d3cywq4ybqu7io.cloudfront.net/cogs/sst/clipped-eez-nztm-20200101090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02_fill_cut_warp_cog.tif'

var cogSource = new ol.source.GeoTIFF({
    normalize: false,
    sources: [
        {
            url: urls3,
            min: 277,
            max: 300,
            nodata: -32768,
        },
    ],
});
```

*Here, we set the min/max of the value from the COG.*

**Step 2** — Build the colour gradient. This tells the client how to colour the values of the COG:

```javascript
var cogBand = ['band', 1]

var defaultColor = {
    color: [
        'interpolate',
        ['linear'],
        cogBand,
        276.9, [255, 255, 255, 0],
        277,   [19, 22, 180, 1],
        284,   [70, 111, 207, 1],
        289,   [196, 229, 183, 1],
        294,   [217, 164, 73, 1],
        300,   [199, 69, 40, 1]
    ],
};
```

*Here, we are using a linear interpolation to create a smooth gradient between the values.*

**Step 3** — Load the COG with colorization:

```javascript
var cog = new ol.layer.WebGLTile({
    visible: false,
    crossOrigin: 'anonymous',
    source: cogSource,
    style: defaultColor,
})
```

*Visibility is set to `false` so the layer is toggled off when the map initializes, allowing users to toggle it on/off.*

## Setting up the Query Pop-up

This is a standard Openlayers pop-up, set up so users can query the SST map and see the actual value at any location.

**Step 1** — Build the pop-up overlay in JS:

```javascript
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

var overlay = new ol.Overlay({
    element: container,
    autoPan: {
        animation: {
            duration: 250,
        },
    },
});

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};
```

**Step 2** — Set the pop-up to query the COG layer on click:

```javascript
map.on('singleclick', function(evt) {
    var coordinate = evt.coordinate;
    var data = cog.getData(evt.pixel);
    var celcius = data[0] - 273.15;
    var codeText = "Temp in Celcius";
    content.innerHTML = "<div class='popupText'>Sea Surface Temperature: <strong>" +
        celcius.toFixed(2) + "</strong><div class='returnVal'>" + codeText + "</div></div>";
    overlay.setPosition(coordinate);
});
```

Those are the main bits. The remainder of the JS handles setting up the base map, building the toggle button, and preparing the query pop-up.

You can clone the [repo](https://github.com/xycarto/cog-load-demo) and do what you like to make it your own. As usual, this example is only one way to do this — there are many other setups and special circumstances that will change what is shown here.

Let me know if this helped or if you have questions. If you used this, I'd love to see what you built!
