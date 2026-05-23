---
layout: post
title:  "GRASS GIS, Docker, Makefile"
date:   2023-10-25
tags:   [GRASS, Docker, GDAL, Geospatial]
---

Small example of using Docker and Makefile to implement GRASS GIS. This blog is written to be complimentary to the Github repository [found here](https://github.com/xycarto/grass-docker-make). Included in this post is a more verbose explanation of what is happening in the Github repository. Users can explore the scripts to see the underlying bits that make each step work. The intention is to help simplify the GRASS set-up and execution of processes using GRASS operations.

**TL;DR** — GitHub repository is [here with the method and documents](https://github.com/xycarto/grass-docker-make).

## Summary

This is a basic example of setting up a scripted GRASS process through a Docker image and using a `Makefile` to launch the process. The goal is to remove the need to install GRASS on your machine and to fully containerize the process within Docker.

It is assumed that users have a familiarity with Docker, Make, and GRASS.

In short, the repo is built to launch a GRASS environment and call a script with the user's GRASS commands. Ideally, users should be able to clone the Github repository, build the Docker locally (or pull it), and run a simple `make` command calling the primary script to perform the GRASS operations.

Methods in the repository have been tested using Ubuntu and macOS operating systems.

**Important** — This method is developed for scripting purposes and is not intended for saving data in your GRASS environment. Using this method, each time the script is run the initial operation checks to see if a GRASS environment exists. If so, that environment is destroyed and a new environment is built.

## Requirements

```
make
docker
```

## Methods

If you prefer to try out the commands given below, you will need to clone the Git repo:

```bash
git clone git@github.com:xycarto/grass-docker-make.git
```

These are the two primary commands to set up the GRASS, Docker, Make operations. Users will first need to build a Docker containing the GRASS installation. Inside the `Makefile` are all the necessary components to find the Dockerfile and build the image. I've tagged this build with "xycarto" (see the top of the makefile); however, you can name this whatever you choose.

**Build GRASS Docker**

```bash
make docker-local
```

**Run GRASS Script**

With the Docker image in place, you can test if the method is working by checking the GRASS version. This `make` command uses two scripts. First, a script is called to construct the GRASS environment and then call the script with all your GRASS operations. The second script is launched using:

```bash
grass grass/GRASS_ENV/PERMANENT --exec bash grass-script.sh
```

The `--exec` flag indicates the script is run within the GRASS environment, giving users access to all GRASS capabilities.

GRASS needs to run within a designated projection. Included in the `make` command is a variable to set this. Users can implement any projection here using the EPSG value. The following builds a GRASS environment in New Zealand Transverse Mercator (NZTM), EPSG:2193:

```bash
make grass-project proj="2193"
```

This should output the GRASS version installed in the Docker.

## Modifications

Users can implement any GRASS commands and methods in the `run-grass.sh` script, simply by modifying the file.

## Passing Variables to GRASS

File variables can be given to the GRASS process back in the `make` command and passed through the `run-grass.sh` script. For example, say you have an `example.tif` file you'd like to process in GRASS. Add a variable to the makefile called `tif`:

```makefile
grass-project:
    $(RUN) bash run-grass.sh $(proj) $(tif)
```

The call of the command looks like:

```bash
make grass-project proj="2193" tif=example.tif
```

Now modify the `run-grass.sh` script to accept the new variable from `make` by adding the following line at the top:

```bash
tif=$2
```

Where `$2` means the second argument in the command. The `run-grass.sh` script now has the tif path variable. Pass it to the actual GRASS script by modifying the last line:

```bash
grass grass/GRASS_ENV/PERMANENT --exec bash grass-script.sh $tif
```

The `grass-script.sh` can now be modified to accept the `tif` variable:

```bash
tif=$1
```

Once you have this set up and running, the real power comes in a scripted method to run a large collection of tifs through a GRASS process. Say you have 1000 tifs to process — list them and loop:

```bash
cat list-of-tifs.txt | xargs -P 1 -t -I % make grass-project proj="2193" tif=%
```

This method sequentially processes the tif list through your GRASS process.

Having a hard time following? Feel free to [contact me](https://xycarto.github.io/xyc-website/contact.html) and I'll see if I can help.
