# node-discordbot
This is a bot for the discord communication tool.
Summary
-------
This bot uses a dynamic command system to handle new functionality. Currently
these commands/functions are integrated:

  - Joining of Voice Channels
  - Spotify Playback of Tracks and Playlists

The codebase is a mess right now and I'd not advise to learn from it or using it
as a reference for your own project. Some of the code has been thrown together
from the examples of the respective libraries.

Installation
------------

First of all you need the latest stable node release to run this app.
Check your local version with:

    $ node -v

After that checkout this repo and install the dependencies with:

    $ npm install

There will probably some compiling errors and warnings, but it should work
anyways.
Start the bot with the following command:

    $ node app.js SPOTIFYUSERNAME SPOTIFYPASSWORD DISCORDUSERNAME DISCORDPASSWORD

It should be noted that while the used Spotify library works with Premium and
free accounts, you cannot use accounts that were created with via a Facebook login.


TODO/ISSUES
-----------

- Crashing on wrong inputs (urgent)
- Crashing on direct messages
- Detect double assigned plugins


DOCKER
------

Build the docker container:
sudo docker build -t "node-discordbot" .

sudo docker ps -a | awk '{ print $1,$2 }' | grep IMAGENAME | awk '{print $1 }' | xargs -I {} sudo docker rm {}

Remove all docker containers of the specified image

sudo docker ps -a | awk '{ print $1,$2 }' | grep IMAGENAME | awk '{print $1 }' | xargs -I {} sudo docker rm {}
Source: http://linuxconfig.org/remove-all-containners-based-on-docker-image-name
