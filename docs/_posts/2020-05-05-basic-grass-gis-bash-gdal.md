---
layout: post
title:  "Basic GRASS GIS with BASH, plus GDAL"
date:   2020-05-05
tags:   [GRASS, GDAL, BASH, Geospatial]
---

As a follow-up to the last blog, I thought it would be helpful to demonstrate how to break up the elevation example into individual watersheds. The reason being, in my last example I demonstrated the process using a square raster tile. Hydrological processes are not accurate when run on square tiles — it is best to run further processes, like stream order extraction, on complete watersheds.

If you are reading this and want to follow along, it is very helpful to go back and read [this blog](https://xycarto.wordpress.com/2020/05/03/basic-grass-gis-with-bash/). The following builds off that last example.

I'll break this into two parts:

1. Creating multiple watershed boundaries of different sizes with GRASS, using a basic loop in BASH.
2. Clipping the original raster by the watershed boundaries using GDAL and SQL with a basic loop in BASH.

## Creating Watershed Boundaries with Varying Sizes

This section will modify the script created in the [last post](https://xycarto.wordpress.com/2020/05/03/basic-grass-gis-with-bash/).

Notice in the previous script, when I used `r.watershed`, I set the threshold value to 100000. You can use this value to set the minimum size of your watershed based on cell units — the minimum number of pixels per watershed, since your cell unit is the size of your pixel.

```bash
threshold=100000
accumulation=${rasterName}_accumulation
drainage=${rasterName}_drainage
stream=${rasterName}_stream
basin=${rasterName}_basin
r.watershed elevation=$fillDEM threshold=$threshold accumulation=$accumulation \
    drainage=$drainage stream=$stream basin=$basin --overwrite
```

Have a play setting the threshold value to different values, like 2000000 or 5000. You will get very different outputs in your watersheds vector layer. Try to determine the upper most threshold value you can input before GRASS can no longer determine a watershed.

*Warning: really small threshold values will take very long to process and give very poor results — like thousands of very tiny watersheds of little to no value in analysis.*

Once you have found your upper most threshold limit, determine a few lesser values and build them into a list. Maybe take the upper limit, half it, then half it again.

Make that into a list variable:

```bash
list=$(echo 2000000 1000000 500000)
```

Then loop the list to iterate through your threshold values when running `r.watershed` in GRASS:

```bash
list=$(echo 2000000 1000000 500000)

for i in $list
do
    threshold=$i
    accumulation=${rasterName}_accumulation_${i}
    drainage=${rasterName}_drainage_${i}
    stream=${rasterName}_stream_${i}
    basin=${rasterName}_basin_${i}
    r.watershed elevation=$fillDEM threshold=$threshold accumulation=$accumulation \
        drainage=$drainage stream=$stream basin=$basin --overwrite

    # Convert Basin (watershed) to vector format
    basinVect=${rasterName}_basinVect_${i}
    r.to.vect input=$basin output=$basinVect type=area column=bnum --overwrite

    # Export catchment to vector format
    basinVectOut=${outDir}/${rasterName}_basinVectOut_${i}.shp
    v.out.ogr input=$basinVect output=$basinVectOut type=area format=ESRI_Shapefile --overwrite
done
```

[Full script example here](https://github.com/xycarto/xycarto_code/blob/master/scripts/grass/GRASS_BASH_blog/catchment_loop.sh)

Your outputs this time will be a collection of shapefile watersheds constructed by your threshold value.

## Clipping your Raster by Individual Watersheds using GDAL, OGR and SQL

The watershed layers are full of nice watersheds, however you cannot simply clip the elevation raster by the full vector file. For the clip, you need to select each individual watershed first. The following demonstrates how to list each of those watersheds and use them as a clip file via a loop.

Set up a test directory for your processed raster outputs:

```bash
mkdir grass_test/raster_watersheds
```

The basic command for clipping a raster with a vector in GDAL is:

```bash
gdalwarp -of GTiff -cutline input_shapefile_for_cut.shp input_raster.tif output_raster.tif
```

You could create a shapefile for each watershed and clip your raster individually, but the process would be fraught with errors and take a very long time. It is much easier to automate the process using a combination of `ogrinfo`, SQL, and GDAL.

We'll use `JM_basinVectOut_2000000.shp` as an example.

**List the 'cat' values in the vector watershed layer:**

```bash
ogrinfo -geom=NO -q \
    -sql "SELECT cat FROM JM_basinVectOut_2000000" \
    /grass_test/JM_basinVectOut_2000000.shp
```

Use `grep` and `sed` to clean up the output into a tidy list:

```bash
ogrinfo -geom=NO -q \
    -sql "SELECT cat FROM JM_basinVectOut_2000000" \
    /home/ireese/grass_test/JM_basinVectOut_2000000.shp \
    | grep 'cat (Integer)' \
    | sed s/'cat (Integer) =//'
```

Make it a variable:

```bash
watershedList=$(ogrinfo -geom=NO -q \
    -sql "SELECT cat FROM JM_basinVectOut_2000000" \
    /home/ireese/grass_test/JM_basinVectOut_2000000.shp \
    | grep 'cat (Integer)' \
    | sed s/'cat (Integer) =//')
```

In `gdalwarp` we leverage the `-sql` switch to select each individual watershed row and clip only by that row:

```bash
gdalwarp -of GTiff -dstnodata -9999 \
    -cutline $inputVector \
    -csql "SELECT cat FROM $inputVectorLayerName where cat='$i'" \
    -crop_to_cutline \
    input_raster.tif output_raster.tif
```

**Putting it all together in a full script:**

```bash
#!/bin/bash

# Set base path
outDir=grass_test
outDirRast=grass_test/raster_watersheds

# Set raster as variable
raster=${outDir}/lds-tile-jm-GTiff/JM.tif
rasterName=$(basename $raster | sed 's/.tif//g')

# Prep your input vectors
inputVector=/home/ireese/grass_test/JM_basinVectOut_2000000.shp
inputVectorLayerName=$(basename $inputVector | sed 's/.shp//')

# Create your watersheds list
watershedList=$(ogrinfo -geom=NO -q \
    -sql "SELECT cat FROM $inputVectorLayerName" \
    $inputVector \
    | grep 'cat (Integer)' \
    | sed s/'cat (Integer) = //')

for i in $watershedList
do
    gdalwarp -of GTiff -dstnodata -9999 \
        -cutline $inputVector \
        -csql "SELECT cat FROM $inputVectorLayerName where cat='$i'" \
        -crop_to_cutline \
        $raster $outDirRast/${rasterName}_${i}.tif
done
```

Save the above script as `rasterClipByWatershed.sh` and run it with:

```bash
bash grass_test/rasterClipByWatershed.sh
```

## Final Note

In the above process, it may be necessary to run some clean up operations to remove **invalid geometries** in the watersheds vector layer. It is helpful to resave the watersheds shapefile first by running a buffer operation with a buffer value of `0`. This removes the invalid geometries. Here is an `ogr2ogr` with PostGIS example:

```bash
ogr2ogr -f "ESRI Shapefile" output_vector.shp input_vector.shp \
    -dialect sqlite \
    -sql "select id, ST_buffer(Geometry,0) as geom from input_vector" \
    -overwrite
```

All the scripts from the past two posts can be found [here](https://github.com/xycarto/xycarto_code/tree/master/scripts/grass/GRASS_BASH_blog).

Let me know if this is helpful. I could potentially move on to doing some more basic hydro analysis with GRASS and BASH, but these things take time and energy. It would be good to know if these sorts of blogs have value to the wider geospatial world.
